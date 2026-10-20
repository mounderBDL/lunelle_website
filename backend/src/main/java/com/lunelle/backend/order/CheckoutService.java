package com.lunelle.backend.order;

import com.lunelle.backend.catalog.*;
import com.lunelle.backend.catalog.CatalogDtos.LocalizedName;
import com.lunelle.backend.common.PhoneUtil;
import com.lunelle.backend.delivery.*;
import com.lunelle.backend.order.OrderDtos.*;
import jakarta.persistence.EntityManager;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CheckoutService {

    private static final int MAX_QUANTITY_PER_ITEM = 10;
    private static final long MAX_SUBTOTAL = 50_000_000L;
    private static final int MAX_ORDERS_PER_PHONE_PER_HOUR = 3;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final VariantRepository variants;
    private final PackRepository packs;
    private final CategoryRepository categories;
    private final PackService packService;
    private final WilayaRepository wilayas;
    private final CommuneRepository communes;
    private final DeliveryService delivery;
    private final StockService stock;
    private final CustomerOrderRepository orders;
    private final OrderStatusHistoryRepository history;
    private final BlockedPhoneRepository blockedPhones;
    private final ApplicationEventPublisher events;
    private final EntityManager em;

    // ───────────── quote (cart / checkout page) ─────────────

    @Transactional(readOnly = true)
    public QuoteDto quote(QuoteRequest r) {
        PricedCart cart = price(r.items(), Instant.now());
        Integer fee = null;
        if (r.deliveryMethod() == DeliveryMethod.HAND_TO_HAND) {
            fee = 0;
        } else if (r.wilayaId() != null) {
            fee = delivery.feeFor(r.wilayaId(), r.deliveryMethod());
        }
        Integer total = fee == null ? null : cart.subtotal() + fee;
        List<QuoteLineDto> lines = cart.lines().stream().map(CheckoutService::toQuoteLine).toList();
        boolean ok = cart.lines().stream().allMatch(l -> l.getProblem() == null);
        return new QuoteDto(lines, cart.subtotal(), fee, total, ok);
    }

    // ───────────── place the order ─────────────

    @Transactional
    public PlacedOrderDto place(CheckoutRequest r) {
        if (r.website() != null && !r.website().isBlank()) {
            throw bad("Invalid request"); // honeypot filled: a bot
        }
        String phone = PhoneUtil.normalize(r.phone());
        if (blockedPhones.existsById(phone)) {
            throw bad("We cannot process this order online. Please contact us.");
        }
        Instant now = Instant.now();
        if (orders.countByPhoneAndCreatedAtAfter(phone, now.minus(Duration.ofHours(1)))
                >= MAX_ORDERS_PER_PHONE_PER_HOUR) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many orders from this number. Please contact us.");
        }

        String locale = r.locale() == null ? "fr" : r.locale();
        PricedCart cart = price(r.items(), now);
        requireAllAvailable(cart, locale);

        Destination dest = destination(r.deliveryMethod(), r.wilayaId(), r.communeId(), r.address());
        int fee = r.deliveryMethod() == DeliveryMethod.HAND_TO_HAND
                ? 0
                : delivery.feeFor(dest.wilayaId(), r.deliveryMethod());

        CustomerOrder order = new CustomerOrder();
        order.setCode(nextCode());
        order.setPublicToken(newToken());
        order.setStatus(OrderStatus.NEW);
        order.setCustomerName(r.customerName().trim().replaceAll("\\s+", " "));
        order.setPhone(phone);
        order.setCustomerNote(blankToNull(r.note()));
        order.setLocale(locale);
        order.setDeliveryMethod(r.deliveryMethod());
        order.setDeliveryFee(fee);
        order.setWilayaId(dest.wilayaId());
        order.setWilayaName(dest.wilayaName());
        order.setCommuneId(dest.communeId());
        order.setCommuneName(dest.communeName());
        order.setAddress(dest.address());
        order.setSubtotal(cart.subtotal());
        order.setTotal(cart.subtotal() + fee);

        for (PricedLine l : cart.lines()) {
            order.getItems().add(buildItem(order, l));
        }
        // sorted by variant id: stock rows are always touched in the same order, so concurrent orders can't deadlock
        Map<UUID, Integer> stockNeeds = OrderStock.needs(order);

        orders.saveAndFlush(order);
        UUID orderId = order.getId();

        OrderStatusHistory h = new OrderStatusHistory();
        h.setOrderId(orderId);
        h.setToStatus(OrderStatus.NEW);
        h.setNote("Order placed");
        history.save(h);

        // Build the response now: the stock updates below clear the persistence context.
        OrderSummaryDto summary = OrderMapper.summary(order);
        String token = order.getPublicToken();
        events.publishEvent(new OrderPlacedEvent(orderId, order.getCode()));

        try {
            for (Map.Entry<UUID, Integer> e : stockNeeds.entrySet()) {
                stock.change(e.getKey(), -e.getValue(), StockReason.ORDER_PLACED, orderId, null, null);
            }
        } catch (ResponseStatusException ex) {
            if (ex.getStatusCode().value() == HttpStatus.CONFLICT.value()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Some items just went out of stock. Please review your cart.");
            }
            throw ex;
        }
        return new PlacedOrderDto(token, summary);
    }

    // ───────────── pricing (also used by the admin order editor) ─────────────

    private record LineKey(OrderItemType type, UUID id) {
    }

    record PricedCart(List<PricedLine> lines, int subtotal) {
    }

    @Getter
    @Setter
    static class PricedLine {
        private OrderItemType type;
        private UUID id;
        private int quantity;
        private String nameEn;
        private String nameFr;
        private String variantLabel;
        private String categoryNameEn;
        private String categoryNameFr;
        private String imageUrl;
        private Integer unitCost;
        private int originalUnitPrice;
        private int unitPrice;
        private boolean requiresFollowUp;
        private LineProblem problem;
        private Pack pack;

        long lineTotal() {
            return (long) unitPrice * quantity;
        }
    }

    PricedCart price(List<CartLineRequest> requested, Instant now) {
        Map<LineKey, Integer> merged = new LinkedHashMap<>();
        for (CartLineRequest l : requested) {
            merged.merge(new LineKey(l.type(), l.id()), l.quantity(), Integer::sum);
        }
        List<PricedLine> priced = new ArrayList<>();
        for (Map.Entry<LineKey, Integer> e : merged.entrySet()) {
            int qty = e.getValue();
            if (qty > MAX_QUANTITY_PER_ITEM) {
                throw bad("Maximum " + MAX_QUANTITY_PER_ITEM + " per item");
            }
            LineKey key = e.getKey();
            priced.add(key.type() == OrderItemType.VARIANT
                    ? variantLine(key.id(), qty, now)
                    : packLine(key.id(), qty));
        }
        long subtotal = priced.stream().mapToLong(PricedLine::lineTotal).sum();
        if (subtotal > MAX_SUBTOTAL) {
            throw bad("This order is too large to place online. Please contact us.");
        }
        return new PricedCart(priced, (int) subtotal);
    }

    /** Builds the order line (snapshots, and the pack components that will leave stock). */
    OrderItem buildItem(CustomerOrder order, PricedLine l) {
        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setType(l.getType());
        item.setNameEn(l.getNameEn());
        item.setNameFr(l.getNameFr());
        item.setVariantLabel(l.getVariantLabel());
        item.setCategoryNameEn(l.getCategoryNameEn());
        item.setCategoryNameFr(l.getCategoryNameFr());
        item.setOriginalUnitPrice(l.getOriginalUnitPrice());
        item.setUnitPrice(l.getUnitPrice());
        item.setUnitCost(l.getUnitCost());
        item.setQuantity(l.getQuantity());
        item.setLineTotal((int) l.lineTotal());
        item.setRequiresFollowUp(l.isRequiresFollowUp());

        if (l.getType() == OrderItemType.VARIANT) {
            item.setVariantId(l.getId());
        } else {
            item.setPackId(l.getId());
            for (PackItem pi : l.getPack().getItems()) {
                ProductVariant v = pi.getVariant();
                Product prod = v.getProduct();
                OrderItemComponent comp = new OrderItemComponent();
                comp.setOrderItem(item);
                comp.setVariantId(v.getId());
                comp.setNameEn(prod.getNameEn());
                comp.setNameFr(prod.getNameFr());
                comp.setVariantLabel(v.getLabel());
                comp.setQuantity(pi.getQuantity());
                item.getComponents().add(comp);
            }
        }
        return item;
    }

    private PricedLine variantLine(UUID id, int qty, Instant now) {
        ProductVariant v = variants.findById(id).orElseThrow(() -> bad("Unknown item in your cart"));
        Product p = v.getProduct();
        Category c = categories.findById(p.getCategoryId()).orElseThrow(() -> bad("Unknown item in your cart"));

        PricedLine l = new PricedLine();
        l.setType(OrderItemType.VARIANT);
        l.setId(v.getId());
        l.setQuantity(qty);
        l.setNameEn(p.getNameEn());
        l.setNameFr(p.getNameFr());
        l.setVariantLabel(v.getLabel());
        l.setCategoryNameEn(c.getNameEn());
        l.setCategoryNameFr(c.getNameFr());
        l.setImageUrl(firstImage(p));
        l.setUnitCost(v.getCostPrice());
        l.setOriginalUnitPrice(v.getPrice());
        l.setUnitPrice(Pricing.finalPrice(p, v.getPrice(), now));
        l.setRequiresFollowUp(c.isRequiresFollowUp());

        boolean sellable = v.isActive() && p.isActive() && p.getArchivedAt() == null && c.isActive();
        if (!sellable) {
            l.setProblem(LineProblem.UNAVAILABLE);
        } else if (v.getStock() < qty) {
            l.setProblem(LineProblem.OUT_OF_STOCK);
        }
        return l;
    }

    private PricedLine packLine(UUID id, int qty) {
        Pack pk = packs.findById(id).orElseThrow(() -> bad("Unknown item in your cart"));

        PricedLine l = new PricedLine();
        l.setType(OrderItemType.PACK);
        l.setId(pk.getId());
        l.setQuantity(qty);
        l.setPack(pk);
        l.setNameEn(pk.getNameEn());
        l.setNameFr(pk.getNameFr());
        l.setImageUrl(pk.getImageUrl());
        l.setUnitCost(Pricing.packCost(pk));
        l.setOriginalUnitPrice(pk.getPrice()); // packs are never discounted
        l.setUnitPrice(pk.getPrice());

        boolean followUp = false;
        for (PackItem pi : pk.getItems()) {
            Product prod = pi.getVariant().getProduct();
            followUp |= categories.findById(prod.getCategoryId())
                    .map(Category::isRequiresFollowUp).orElse(false);
        }
        l.setRequiresFollowUp(followUp);

        boolean sellable = pk.isActive() && pk.getArchivedAt() == null;
        if (!sellable) {
            l.setProblem(LineProblem.UNAVAILABLE);
        } else if (packService.availableUnits(pk) < qty) {
            l.setProblem(LineProblem.OUT_OF_STOCK);
        }
        return l;
    }

    private void requireAllAvailable(PricedCart cart, String locale) {
        List<String> names = cart.lines().stream()
                .filter(l -> l.getProblem() != null)
                .map(l -> ("fr".equals(locale) ? l.getNameFr() : l.getNameEn())
                        + (l.getVariantLabel() == null ? "" : " (" + l.getVariantLabel() + ")"))
                .toList();
        if (!names.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Some items are no longer available: " + String.join(", ", names));
        }
    }

    private static QuoteLineDto toQuoteLine(PricedLine l) {
        return new QuoteLineDto(l.getType(), l.getId(), new LocalizedName(l.getNameEn(), l.getNameFr()),
                l.getVariantLabel(), l.getImageUrl(), l.getOriginalUnitPrice(), l.getUnitPrice(),
                l.getQuantity(), (int) l.lineTotal(), l.getProblem());
    }

    // ───────────── delivery destination ─────────────

    record Destination(Integer wilayaId, String wilayaName, Integer communeId,
                       String communeName, String address) {
    }

    Destination destination(DeliveryMethod method, Integer wilayaId, Integer communeId, String address) {
        if (method == DeliveryMethod.HAND_TO_HAND) {
            return new Destination(null, null, null, null, null);
        }
        if (wilayaId == null) {
            throw bad("Please choose a wilaya");
        }
        Wilaya wilaya = wilayas.findById(wilayaId).filter(Wilaya::isActive)
                .orElseThrow(() -> bad("This wilaya is not available"));
        if (communeId == null) {
            throw bad("Please choose a commune");
        }
        Commune commune = communes.findById(communeId)
                .filter(c -> c.isActive() && c.getWilayaId().equals(wilaya.getId()))
                .orElseThrow(() -> bad("Invalid commune for this wilaya"));
        String addr = blankToNull(address);
        if (method == DeliveryMethod.HOME && (addr == null || addr.length() < 5)) {
            throw bad("Please enter your delivery address");
        }
        return new Destination(wilaya.getId(), wilaya.getName(), commune.getId(), commune.getName(),
                method == DeliveryMethod.HOME ? addr : null);
    }

    // ───────────── helpers ─────────────

    private String nextCode() {
        long n = ((Number) em.createNativeQuery("select nextval('order_code_seq')").getSingleResult()).longValue();
        return String.format("LN-%06d", n);
    }

    private static String newToken() {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String firstImage(Product p) {
        return p.getImages().stream()
                .min(Comparator.comparingInt(ProductImage::getSortOrder))
                .map(ProductImage::getUrl)
                .orElse(null);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}