package com.lunelle.backend.order;

import com.lunelle.backend.delivery.DeliveryMethod;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.lunelle.backend.order.OrderStatus.*;

final class OrderWorkflow {

    private static final Map<OrderStatus, Set<OrderStatus>> NEXT = Map.of(
            NEW, Set.of(CONFIRMED, CANCELLED, NO_ANSWER),
            NO_ANSWER, Set.of(NEW, CANCELLED),
            CONFIRMED, Set.of(SHIPPED, DELIVERED, CANCELLED),
            SHIPPED, Set.of(DELIVERED, RETURNED),
            DELIVERED, Set.of(RETURNED),
            CANCELLED, Set.of(),
            RETURNED, Set.of());

    private OrderWorkflow() {
    }

    /** Hand-to-hand orders skip SHIPPED; delivered orders must be shipped first. */
    static List<OrderStatus> allowed(CustomerOrder o) {
        boolean handToHand = o.getDeliveryMethod() == DeliveryMethod.HAND_TO_HAND;
        OrderStatus current = o.getStatus();
        return NEXT.get(current).stream()
                .filter(to -> !(handToHand && to == SHIPPED))
                .filter(to -> !(!handToHand && current == CONFIRMED && to == DELIVERED))
                .sorted()
                .toList();
    }
}