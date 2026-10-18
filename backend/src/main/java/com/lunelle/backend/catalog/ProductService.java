package com.lunelle.backend.catalog;

import com.lunelle.backend.catalog.CatalogDtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository products;
    private final CategoryRepository categories;
    private final VariantRepository variants;
    private final StockService stock;

    // ───────────── storefront ─────────────

    @Transactional(readOnly = true)
    public List<PublicProductDto> listPublic(String categorySlug, Boolean featured) {
        Instant now = Instant.now();
        Map<UUID, Category> activeCategories = activeCategories();
        return products.findAllByOrderBySortOrderAscCreatedAtDesc().stream()
                .filter(p -> isVisible(p, activeCategories))
                .filter(p -> categorySlug == null
                        || categorySlug.equals(activeCategories.get(p.getCategoryId()).getSlug()))
                .filter(p -> featured == null || p.isFeatured() == featured)
                .map(p -> CatalogMapper.publicProduct(p, activeCategories.get(p.getCategoryId()), now))
                .toList();
    }

    @Transactional(readOnly = true)
    public PublicProductDto getPublic(String slug) {
        Map<UUID, Category> activeCategories = activeCategories();
        Product p = products.findBySlug(slug)
                .filter(x -> isVisible(x, activeCategories))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        return CatalogMapper.publicProduct(p, activeCategories.get(p.getCategoryId()), Instant.now());
    }

    // ───────────── admin: products ─────────────

    @Transactional(readOnly = true)
    public List<AdminProductDto> listAdmin(UUID categoryId, boolean includeArchived) {
        Instant now = Instant.now();
        Map<UUID, Category> all = categories.findAll().stream()
                .collect(Collectors.toMap(Category::getId, Function.identity()));
        return products.findAllByOrderBySortOrderAscCreatedAtDesc().stream()
                .filter(p -> includeArchived || p.getArchivedAt() == null)
                .filter(p -> categoryId == null || categoryId.equals(p.getCategoryId()))
                .map(p -> CatalogMapper.adminProduct(p, all.get(p.getCategoryId()), now))
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminProductDto getAdmin(UUID id) {
        return adminDto(find(id));
    }

    @Transactional
    public AdminProductDto create(CreateProductRequest r, UUID adminId) {
        Category category = category(r.categoryId());
        ensureDistinctLabels(r.variants().stream().map(CreateVariantRequest::label).toList());

        Product p = new Product();
        p.setCategoryId(category.getId());
        p.setSlug(TextUtil.uniqueSlug(r.name().en(), products::existsBySlug));
        applyFields(p, r.name(), r.description(), r.scentNotes(), r.badge(),
                r.active(), r.featured(), r.sortOrder());
        for (CreateVariantRequest vr : r.variants()) {
            ProductVariant v = new ProductVariant();
            v.setProduct(p);
            applyVariant(v, vr.label(), vr.sku(), vr.price(), vr.active(), vr.sortOrder());
            v.setStock(vr.initialStock()); // only allowed here, at creation
            p.getVariants().add(v);
        }
        products.saveAndFlush(p);
        p.getVariants().forEach(v -> stock.recordInitial(v.getId(), v.getStock(), adminId));
        return CatalogMapper.adminProduct(p, category, Instant.now());
    }

    @Transactional
    public AdminProductDto update(UUID id, UpdateProductRequest r) {
        Product p = find(id);
        Category category = category(r.categoryId());
        p.setCategoryId(category.getId());
        applyFields(p, r.name(), r.description(), r.scentNotes(), r.badge(),
                r.active(), r.featured(), r.sortOrder());
        return CatalogMapper.adminProduct(p, category, Instant.now());
    }

    @Transactional
    public AdminProductDto setDiscount(UUID id, DiscountRequest r) {
        Product p = find(id);
        if (r.active()) {
            if (r.type() == null || r.value() == null) {
                throw bad("An active discount needs a type and a value");
            }
            if (r.type() == DiscountType.PERCENT && r.value() > 99) {
                throw bad("A percentage discount must be between 1 and 99");
            }
            if (r.type() == DiscountType.FIXED) {
                int cheapest = p.getVariants().stream().mapToInt(ProductVariant::getPrice).min().orElse(0);
                if (r.value() >= cheapest) {
                    throw bad("A fixed discount must be lower than the cheapest size price (" + cheapest + ")");
                }
            }
            if (r.startsAt() != null && r.endsAt() != null && !r.endsAt().isAfter(r.startsAt())) {
                throw bad("The discount end date must be after its start date");
            }
        }
        p.setDiscountActive(r.active());
        p.setDiscountType(r.type());
        p.setDiscountValue(r.value());
        p.setDiscountStartsAt(r.startsAt());
        p.setDiscountEndsAt(r.endsAt());
        return adminDto(p);
    }

    /** "Delete" = archive: hidden everywhere, but old orders and stats keep working. */
    @Transactional
    public AdminProductDto archive(UUID id) {
        Product p = find(id);
        p.setArchivedAt(Instant.now());
        p.setActive(false);
        return adminDto(p);
    }

    @Transactional
    public AdminProductDto restore(UUID id) {
        Product p = find(id);
        p.setArchivedAt(null); // stays inactive until the admin re-enables it
        return adminDto(p);
    }

    // ───────────── admin: variants (sizes) ─────────────

    @Transactional
    public AdminProductDto addVariant(UUID productId, CreateVariantRequest r, UUID adminId) {
        Product p = find(productId);
        if (labelTaken(p, r.label(), null)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This product already has a size named " + r.label());
        }
        ProductVariant v = new ProductVariant();
        v.setProduct(p);
        applyVariant(v, r.label(), r.sku(), r.price(), r.active(), r.sortOrder());
        v.setStock(r.initialStock());
        p.getVariants().add(v);
        products.saveAndFlush(p);
        stock.recordInitial(v.getId(), v.getStock(), adminId);
        return adminDto(p);
    }

    @Transactional
    public AdminProductDto updateVariant(UUID variantId, UpdateVariantRequest r) {
        ProductVariant v = variants.findById(variantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown size"));
        Product p = v.getProduct();
        if (labelTaken(p, r.label(), v.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This product already has a size named " + r.label());
        }
        applyVariant(v, r.label(), r.sku(), r.price(), r.active(), r.sortOrder());
        return adminDto(p);
    }

    @Transactional
    public AdminProductDto deleteVariant(UUID variantId) {
        ProductVariant v = variants.findById(variantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown size"));
        Product p = v.getProduct();
        if (p.getVariants().size() <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A product must keep at least one size");
        }
        p.getVariants().remove(v);
        products.flush(); // surfaces "still used in a pack" now, as a 409
        return adminDto(p);
    }

    // ───────────── helpers ─────────────

    private Product find(UUID id) {
        return products.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    private Category category(UUID id) {
        return categories.findById(id).orElseThrow(() -> bad("Unknown category"));
    }

    private AdminProductDto adminDto(Product p) {
        return CatalogMapper.adminProduct(p, category(p.getCategoryId()), Instant.now());
    }

    private Map<UUID, Category> activeCategories() {
        return categories.findByActiveTrueOrderBySortOrderAscNameEnAsc().stream()
                .collect(Collectors.toMap(Category::getId, Function.identity()));
    }

    private boolean isVisible(Product p, Map<UUID, Category> activeCategories) {
        return p.isActive()
                && p.getArchivedAt() == null
                && activeCategories.containsKey(p.getCategoryId())
                && p.getVariants().stream().anyMatch(ProductVariant::isActive);
    }

    private boolean labelTaken(Product p, String label, UUID exceptVariantId) {
        return p.getVariants().stream().anyMatch(o ->
                !o.getId().equals(exceptVariantId) && o.getLabel().equalsIgnoreCase(label.trim()));
    }

    private void ensureDistinctLabels(List<String> labels) {
        Set<String> seen = new HashSet<>();
        for (String label : labels) {
            if (!seen.add(label.trim().toLowerCase())) {
                throw bad("Two sizes have the same name: " + label);
            }
        }
    }

    private void applyFields(Product p, LocalizedName name, LocalizedText description, LocalizedText notes,
                             String badge, boolean active, boolean featured, int sortOrder) {
        p.setNameEn(name.en().trim());
        p.setNameFr(name.fr().trim());
        p.setDescriptionEn(description == null ? null : TextUtil.blankToNull(description.en()));
        p.setDescriptionFr(description == null ? null : TextUtil.blankToNull(description.fr()));
        p.setScentNotesEn(notes == null ? null : TextUtil.blankToNull(notes.en()));
        p.setScentNotesFr(notes == null ? null : TextUtil.blankToNull(notes.fr()));
        p.setBadge(TextUtil.blankToNull(badge));
        p.setActive(active);
        p.setFeatured(featured);
        p.setSortOrder(sortOrder);
    }

    private void applyVariant(ProductVariant v, String label, String sku, int price, boolean active, int sortOrder) {
        v.setLabel(label.trim());
        v.setSku(TextUtil.blankToNull(sku));
        v.setPrice(price);
        v.setActive(active);
        v.setSortOrder(sortOrder);
    }

    private ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}