package com.lunelle.backend.catalog;

import com.lunelle.backend.catalog.CatalogDtos.ImageDto;
import com.lunelle.backend.catalog.PackDtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PackService {

    private final PackRepository packs;
    private final VariantRepository variants;

    // ───────────── storefront ─────────────

    @Transactional(readOnly = true)
    public List<PublicPackDto> listPublic() {
        Instant now = Instant.now();
        return packs.findAllByOrderBySortOrderAscCreatedAtDesc().stream()
                .filter(PackService::visible)
                .map(p -> toPublic(p, now))
                .toList();
    }

    @Transactional(readOnly = true)
    public PublicPackDto getPublic(String slug) {
        Pack p = packs.findBySlug(slug)
                .filter(PackService::visible)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pack not found"));
        return toPublic(p, Instant.now());
    }

    // ───────────── admin ─────────────

    @Transactional(readOnly = true)
    public List<AdminPackDto> listAdmin(boolean includeArchived) {
        Instant now = Instant.now();
        return packs.findAllByOrderBySortOrderAscCreatedAtDesc().stream()
                .filter(p -> includeArchived || p.getArchivedAt() == null)
                .map(p -> toAdmin(p, now))
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminPackDto getAdmin(UUID id) {
        return toAdmin(find(id), Instant.now());
    }

    @Transactional
    public AdminPackDto create(PackRequest r) {
        Map<UUID, Integer> wanted = wantedItems(r);
        Map<UUID, ProductVariant> found = loadVariants(wanted);
        validatePrice(r.price(), wanted, found);

        Pack p = new Pack();
        p.setSlug(TextUtil.uniqueSlug(r.name().en(), packs::existsBySlug));
        applyFields(p, r);
        syncItems(p, wanted, found);
        packs.saveAndFlush(p);
        return toAdmin(p, Instant.now());
    }

    @Transactional
    public AdminPackDto update(UUID id, PackRequest r) {
        Pack p = find(id);
        if (p.getArchivedAt() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Restore the pack before editing it");
        }
        Map<UUID, Integer> wanted = wantedItems(r);
        Map<UUID, ProductVariant> found = loadVariants(wanted);
        validatePrice(r.price(), wanted, found);

        applyFields(p, r);
        syncItems(p, wanted, found);
        packs.flush();
        return toAdmin(p, Instant.now());
    }

    /** "Delete" = archive: hidden from the storefront, kept for old orders and stats. */
    @Transactional
    public AdminPackDto archive(UUID id) {
        Pack p = find(id);
        p.setArchivedAt(Instant.now());
        p.setActive(false);
        return toAdmin(p, Instant.now());
    }

    @Transactional
    public AdminPackDto restore(UUID id) {
        Pack p = find(id);
        p.setArchivedAt(null); // stays inactive until the admin re-enables it
        return toAdmin(p, Instant.now());
    }

    /**
     * Number of packs that can be sold right now (0 when any component is hidden,
     * archived or out of stock). Checkout will reuse this.
     */
    public int availableUnits(Pack pack) {
        int min = Integer.MAX_VALUE;
        for (PackItem item : pack.getItems()) {
            ProductVariant v = item.getVariant();
            if (!componentOk(v)) {
                return 0;
            }
            min = Math.min(min, v.getStock() / item.getQuantity());
        }
        return min == Integer.MAX_VALUE ? 0 : min;
    }

    // ───────────── helpers ─────────────

    private Pack find(UUID id) {
        return packs.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pack not found"));
    }

    private static boolean visible(Pack p) {
        return p.isActive() && p.getArchivedAt() == null;
    }

    private static boolean componentOk(ProductVariant v) {
        Product p = v.getProduct();
        return v.isActive() && p.isActive() && p.getArchivedAt() == null;
    }

    private Map<UUID, Integer> wantedItems(PackRequest r) {
        Map<UUID, Integer> wanted = new LinkedHashMap<>();
        for (PackItemRequest item : r.items()) {
            if (wanted.put(item.variantId(), item.quantity()) != null) {
                throw bad("The same size is listed twice; use the quantity instead");
            }
        }
        int units = wanted.values().stream().mapToInt(Integer::intValue).sum();
        if (units < 2) {
            throw bad("A pack needs at least two items");
        }
        return wanted;
    }

    private Map<UUID, ProductVariant> loadVariants(Map<UUID, Integer> wanted) {
        Map<UUID, ProductVariant> found = variants.findAllById(wanted.keySet()).stream()
                .collect(Collectors.toMap(ProductVariant::getId, Function.identity()));
        if (found.size() != wanted.size()) {
            throw bad("One of the sizes does not exist");
        }
        for (ProductVariant v : found.values()) {
            if (!componentOk(v)) {
                throw bad(v.getProduct().getNameEn() + " (" + v.getLabel() + ") is hidden or archived");
            }
        }
        return found;
    }

    private void validatePrice(int price, Map<UUID, Integer> wanted, Map<UUID, ProductVariant> found) {
        Instant now = Instant.now();
        long individual = 0;
        for (Map.Entry<UUID, Integer> e : wanted.entrySet()) {
            ProductVariant v = found.get(e.getKey());
            individual += (long) Pricing.finalPrice(v.getProduct(), v.getPrice(), now) * e.getValue();
        }
        if (price >= individual) {
            throw bad("The pack price (" + price + ") must be lower than the items bought separately (" + individual + ")");
        }
    }

    private void applyFields(Pack p, PackRequest r) {
        p.setNameEn(r.name().en().trim());
        p.setNameFr(r.name().fr().trim());
        p.setDescriptionEn(r.description() == null ? null : TextUtil.blankToNull(r.description().en()));
        p.setDescriptionFr(r.description() == null ? null : TextUtil.blankToNull(r.description().fr()));
        p.setImageUrl(TextUtil.blankToNull(r.imageUrl()));
        p.setPrice(r.price());
        p.setActive(r.active());
        p.setSortOrder(r.sortOrder());
    }

    /**
     * Diff-based on purpose: replacing all rows would insert before deleting and
     * break the unique (pack, size) constraint.
     */
    private void syncItems(Pack pack, Map<UUID, Integer> wanted, Map<UUID, ProductVariant> found) {
        Map<UUID, Integer> remaining = new LinkedHashMap<>(wanted);
        pack.getItems().removeIf(item -> !remaining.containsKey(item.getVariant().getId()));
        for (PackItem item : pack.getItems()) {
            item.setQuantity(remaining.remove(item.getVariant().getId()));
        }
        remaining.forEach((variantId, quantity) -> {
            PackItem item = new PackItem();
            item.setPack(pack);
            item.setVariant(found.get(variantId));
            item.setQuantity(quantity);
            pack.getItems().add(item);
        });
    }

    private long individualTotal(Pack p, Instant now) {
        long total = 0;
        for (PackItem item : p.getItems()) {
            ProductVariant v = item.getVariant();
            total += (long) Pricing.finalPrice(v.getProduct(), v.getPrice(), now) * item.getQuantity();
        }
        return total;
    }

    private AdminPackDto toAdmin(Pack p, Instant now) {
        int individual = (int) individualTotal(p, now);
        int units = availableUnits(p);
        List<AdminPackItemDto> items = p.getItems().stream()
                .sorted(itemOrder())
                .map(i -> {
                    ProductVariant v = i.getVariant();
                    Product prod = v.getProduct();
                    return new AdminPackItemDto(v.getId(), prod.getId(),
                            CatalogMapper.name(prod.getNameEn(), prod.getNameFr()), v.getLabel(),
                            i.getQuantity(), Pricing.finalPrice(prod, v.getPrice(), now),
                            v.getStock(), componentOk(v) && v.getStock() >= i.getQuantity());
                })
                .toList();
        Integer cost = Pricing.packCost(p);
        return new AdminPackDto(p.getId(), p.getSlug(),
                CatalogMapper.name(p.getNameEn(), p.getNameFr()),
                CatalogMapper.text(p.getDescriptionEn(), p.getDescriptionFr()),
                p.getImageUrl(), p.getPrice(), individual, Math.max(0, individual - p.getPrice()),
                cost, cost == null ? null : p.getPrice() - cost,
                p.isActive(), p.getArchivedAt() != null, p.getSortOrder(),
                units, units > 0, items, p.getCreatedAt());
    }

    private PublicPackDto toPublic(Pack p, Instant now) {
        int individual = (int) individualTotal(p, now);
        List<PublicPackItemDto> items = p.getItems().stream()
                .sorted(itemOrder())
                .map(i -> {
                    ProductVariant v = i.getVariant();
                    Product prod = v.getProduct();
                    List<ImageDto> images = CatalogMapper.images(prod);
                    return new PublicPackItemDto(prod.getSlug(),
                            CatalogMapper.name(prod.getNameEn(), prod.getNameFr()), v.getLabel(),
                            i.getQuantity(), images.isEmpty() ? null : images.get(0).url());
                })
                .toList();
        return new PublicPackDto(p.getId(), p.getSlug(),
                CatalogMapper.name(p.getNameEn(), p.getNameFr()),
                CatalogMapper.text(p.getDescriptionEn(), p.getDescriptionFr()),
                p.getImageUrl(), p.getPrice(), individual, Math.max(0, individual - p.getPrice()),
                availableUnits(p) > 0, items);
    }

    private static Comparator<PackItem> itemOrder() {
        return Comparator
                .comparing((PackItem i) -> i.getVariant().getProduct().getNameEn())
                .thenComparing(i -> i.getVariant().getLabel());
    }

    private ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}