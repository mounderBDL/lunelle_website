package com.lunelle.backend.order;

import com.lunelle.backend.catalog.StockReason;
import com.lunelle.backend.catalog.StockService;
import com.lunelle.backend.common.PhoneUtil;
import com.lunelle.backend.delivery.DeliveryMethod;
import com.lunelle.backend.delivery.DeliveryService;
import com.lunelle.backend.order.OrderAdminDtos.*;
import com.lunelle.backend.order.OrderDtos.CartLineRequest;
import com.lunelle.backend.catalog.Pricing;

import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@Service
@RequiredArgsConstructor
public class OrderAdminService {

    private static final ZoneId ZONE = ZoneId.of("Africa/Algiers");
    private static final int MAX_QUANTITY_PER_ITEM = Pricing.MAX_PER_ITEM;
    private static final long MAX_TOTAL = 50_000_000L;

    private final CustomerOrderRepository orders;
    private final OrderItemRepository orderItems;
    private final OrderStatusHistoryRepository history;
    private final CheckoutService checkout;
    private final DeliveryService delivery;
    private final StockService stock;
    

    private record Key(OrderItemType type, UUID id) {
    }

    // ───────────── reading ─────────────

    @Transactional(readOnly = true)
    public PageDto<OrderListItemDto> list(OrderStatus status, String q, Integer wilayaId,
                                          DeliveryMethod method, LocalDate from, LocalDate to,
                                           int page, int size) {
        Specification<CustomerOrder> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (status != null) {
                ps.add(cb.equal(root.get("status"), status));
            }
            if (wilayaId != null) {
                ps.add(cb.equal(root.get("wilayaId"), wilayaId));
            }
            if (method != null) {
                ps.add(cb.equal(root.get("deliveryMethod"), method));
            }
            if (from != null) {
                ps.add(cb.greaterThanOrEqualTo(root.<Instant>get("createdAt"),
                        from.atStartOfDay(ZONE).toInstant()));
            }
            if (to != null) {
                ps.add(cb.lessThan(root.<Instant>get("createdAt"),
                        to.plusDays(1).atStartOfDay(ZONE).toInstant()));
            }
            if (q != null && !q.isBlank()) {
                String term = q.trim();
                String like = "%" + term.toLowerCase(Locale.ROOT)
                        .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                List<Predicate> any = new ArrayList<>();
                any.add(cb.like(cb.lower(root.<String>get("code")), like, '\\'));
                any.add(cb.like(cb.lower(root.<String>get("customerName")), like, '\\'));
                String digits = term.replaceAll("\\D", "");
                if (digits.length() >= 3) {
                    any.add(cb.like(root.<String>get("phone"), "%" + digits + "%"));
                }
                try {
                    any.add(cb.equal(root.get("phone"), PhoneUtil.normalize(term)));
                } catch (ResponseStatusException ignored) {
                    // not a full phone number: the partial match above is enough
                }
                ps.add(cb.or(any.toArray(new Predicate[0])));
            }
            return cb.and(ps.toArray(new Predicate[0]));
        };

        Page<CustomerOrder> result = orders.findAll(spec, PageRequest.of(
                Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt")));
        return new PageDto<>(
                result.getContent().stream().map(OrderAdminMapper::listItem).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public Map<OrderStatus, Long> counts() {
        Map<OrderStatus, Long> map = new EnumMap<>(OrderStatus.class);
        for (OrderStatus s : OrderStatus.values()) {
            map.put(s, 0L);
        }
        for (Object[] row : orders.countByStatus()) {
            map.put((OrderStatus) row[0], (Long) row[1]);
        }
        return map;
    }

    @Transactional(readOnly = true)
    public OrderDetailDto get(UUID id) {
        return detail(id);
    }

    // ───────────── status changes ─────────────

    @Transactional
    public OrderDetailDto changeStatus(UUID id, ChangeStatusRequest r, UUID adminId) {
        CustomerOrder o = lock(id);
        OrderStatus from = o.getStatus();
        OrderStatus to = r.status();
        if (!OrderWorkflow.allowed(o).contains(to)) {
            throw conflict("This order cannot move from " + from + " to " + to);
        }
        if (to == OrderStatus.CONFIRMED) {
            validateForConfirmation(o);
        }

        UUID orderId = o.getId();
        String code = o.getCode();
        Map<UUID, Integer> needs = OrderStock.needs(o);
        Instant now = Instant.now();

        o.setStatus(to);
        switch (to) {
            case CONFIRMED -> o.setConfirmedAt(now);
            case SHIPPED -> {
                o.setShippedAt(now);
                String tracking = blankToNull(r.trackingNumber());
                if (tracking != null) {
                    o.setTrackingNumber(tracking);
                }
            }
            case DELIVERED -> o.setDeliveredAt(now);
            case CANCELLED -> o.setCancelledAt(now);
            default -> {
            }
        }

        OrderStatusHistory h = new OrderStatusHistory();
        h.setOrderId(orderId);
        h.setFromStatus(from);
        h.setToStatus(to);
        h.setNote(blankToNull(r.note()));
        h.setAdminId(adminId);
        history.save(h);
        orders.saveAndFlush(o);

        // Stock moves AFTER the flush: the stock updates clear the persistence context.
        boolean release = (from == OrderStatus.NEW || from == OrderStatus.CONFIRMED)
                && (to == OrderStatus.CANCELLED || to == OrderStatus.NO_ANSWER);
        boolean take = from == OrderStatus.NO_ANSWER && to == OrderStatus.NEW;
        if (release) {
            needs.replaceAll((k, v) -> v);
            applyStock(needs, StockReason.ORDER_RELEASED, orderId, adminId, "Order " + code + " " + to);
        } else if (take) {
            needs.replaceAll((k, v) -> -v);
            applyStock(needs, StockReason.ORDER_PLACED, orderId, adminId, "Order " + code + " reopened");
        }
        return detail(orderId);
    }

    private void validateForConfirmation(CustomerOrder o) {
        if (o.getDeliveryMethod() == DeliveryMethod.HAND_TO_HAND && isBlank(o.getHandoverPlace())) {
            throw bad("Set the hand-over place before confirming");
        }
    }

    // ───────────── editing (only while NEW) ─────────────

    @Transactional
    public OrderDetailDto edit(UUID id, EditOrderRequest r, UUID adminId) {
        CustomerOrder o = lock(id);
        if (o.getStatus() != OrderStatus.NEW) {
            throw conflict("Only new orders can be edited");
        }
        UUID orderId = o.getId();
        String phone = PhoneUtil.normalize(r.phone());
        CheckoutService.Destination dest =
                checkout.destination(r.deliveryMethod(), r.wilayaId(), r.communeId(), r.address());

        int fee;
        if (r.deliveryMethod() == DeliveryMethod.HAND_TO_HAND) {
            fee = 0;
        } else if (r.deliveryMethod() == o.getDeliveryMethod() && Objects.equals(dest.wilayaId(), o.getWilayaId())) {
            fee = o.getDeliveryFee(); // same destination: keep the fee the customer saw
        } else {
            fee = delivery.feeFor(dest.wilayaId(), r.deliveryMethod());
        }

        Map<UUID, Integer> before = OrderStock.needs(o);

        Map<Key, Integer> wanted = new LinkedHashMap<>();
        for (CartLineRequest l : r.items()) {
            wanted.merge(new Key(l.type(), l.id()), l.quantity(), Integer::sum);
        }
        for (int qty : wanted.values()) {
            if (qty > MAX_QUANTITY_PER_ITEM) {
                throw bad("Maximum " + MAX_QUANTITY_PER_ITEM + " per item");
            }
        }

        // lines already on the order keep their original prices; only the quantity changes
        Map<Key, OrderItem> existing = new HashMap<>();
        for (OrderItem item : o.getItems()) {
            Key k = keyOf(item);
            if (k != null) {
                existing.put(k, item);
            }
        }
        o.getItems().removeIf(item -> {
            Key k = keyOf(item);
            return k == null || !wanted.containsKey(k);
        });

        List<CartLineRequest> added = new ArrayList<>();
        for (Map.Entry<Key, Integer> e : wanted.entrySet()) {
            OrderItem item = existing.get(e.getKey());
            if (item != null) {
                item.setQuantity(e.getValue());
                item.setLineTotal(item.getUnitPrice() * e.getValue());
            } else {
                added.add(new CartLineRequest(e.getKey().type(), e.getKey().id(), e.getValue()));
            }
        }
        if (!added.isEmpty()) {
            CheckoutService.PricedCart cart = checkout.price(added, Instant.now());
            for (CheckoutService.PricedLine l : cart.lines()) {
                if (l.getProblem() == LineProblem.UNAVAILABLE) {
                    throw conflict(l.getNameEn() + " is no longer available");
                }
                o.getItems().add(checkout.buildItem(o, l));
            }
        }

        long subtotal = o.getItems().stream().mapToLong(OrderItem::getLineTotal).sum();
        if (subtotal + fee > MAX_TOTAL) {
            throw bad("This order is too large");
        }

        o.setCustomerName(r.customerName().trim().replaceAll("\\s+", " "));
        o.setPhone(phone);
        o.setCustomerNote(blankToNull(r.customerNote()));
        o.setDeliveryMethod(r.deliveryMethod());
        o.setWilayaId(dest.wilayaId());
        o.setWilayaName(dest.wilayaName());
        o.setCommuneId(dest.communeId());
        o.setCommuneName(dest.communeName());
        o.setAddress(dest.address());
        o.setDeliveryFee(fee);
        o.setSubtotal((int) subtotal);
        o.setTotal((int) subtotal + fee);
        if (r.deliveryMethod() != DeliveryMethod.HAND_TO_HAND) {
            o.setHandoverPlace(null);
            o.setHandoverAt(null);
        }

        Map<UUID, Integer> after = OrderStock.needs(o);
        Map<UUID, Integer> deltas = new TreeMap<>();
        Set<UUID> variantIds = new TreeSet<>(before.keySet());
        variantIds.addAll(after.keySet());
        for (UUID v : variantIds) {
            deltas.put(v, before.getOrDefault(v, 0) - after.getOrDefault(v, 0)); // + returns stock, - takes it
        }

        OrderStatusHistory h = new OrderStatusHistory();
        h.setOrderId(orderId);
        h.setFromStatus(OrderStatus.NEW);
        h.setToStatus(OrderStatus.NEW);
        h.setNote("Order edited");
        h.setAdminId(adminId);
        history.save(h);
        String code = o.getCode();
        orders.saveAndFlush(o);

        applyStock(deltas, StockReason.ORDER_EDITED, orderId, adminId, "Order " + code + " edited");
        return detail(orderId);
    }

    // ───────────── notes, hand-over, tracking ─────────────

    @Transactional
    public OrderDetailDto updateDetails(UUID id, UpdateDetailsRequest r) {
        CustomerOrder o = lock(id);
        o.setAdminNote(blankToNull(r.adminNote()));

        boolean hand = o.getDeliveryMethod() == DeliveryMethod.HAND_TO_HAND;
        OrderStatus s = o.getStatus();

        String place = blankToNull(r.handoverPlace());
        boolean handoverOpen = hand && (s == OrderStatus.NEW || s == OrderStatus.CONFIRMED);
        if (handoverOpen) {
            o.setHandoverPlace(place);
            o.setHandoverAt(r.handoverAt());
        } else if (!Objects.equals(place, o.getHandoverPlace()) || !Objects.equals(r.handoverAt(), o.getHandoverAt())) {
            throw bad(hand ? "Hand-over details can no longer be changed"
                    : "Hand-over details only apply to hand-to-hand orders");
        }

        String tracking = blankToNull(r.trackingNumber());
        boolean trackingOpen = !hand && (s == OrderStatus.CONFIRMED || s == OrderStatus.SHIPPED);
        if (trackingOpen) {
            o.setTrackingNumber(tracking);
        } else if (!Objects.equals(tracking, o.getTrackingNumber())) {
            throw bad("The tracking number cannot be changed at this stage");
        }
        return detail(o.getId());
    }

    // ───────────── helpers ─────────────

    private CustomerOrder lock(UUID id) {
        return orders.findForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    private OrderDetailDto detail(UUID id) {
        CustomerOrder o = orders.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        return OrderAdminMapper.detail(o, history.findByOrderIdOrderByCreatedAtAsc(id));
    }

    /** Positive delta returns stock, negative takes it. Sorted by size id. Never touch the order afterwards. */
    private void applyStock(Map<UUID, Integer> deltas, StockReason reason, UUID orderId, UUID adminId, String note) {
        try {
            for (Map.Entry<UUID, Integer> e : deltas.entrySet()) {
                if (e.getValue() != 0) {
                    stock.change(e.getKey(), e.getValue(), reason, orderId, adminId, note);
                }
            }
        } catch (ResponseStatusException ex) {
            if (ex.getStatusCode().value() == HttpStatus.CONFLICT.value()) {
                throw conflict("Not enough stock for this change");
            }
            throw ex;
        }
    }

    private static Key keyOf(OrderItem i) {
        UUID id = i.getType() == OrderItemType.VARIANT ? i.getVariantId() : i.getPackId();
        return id == null ? null : new Key(i.getType(), id);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}