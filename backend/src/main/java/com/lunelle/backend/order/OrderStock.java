package com.lunelle.backend.order;

import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/** How much stock an order holds, per size. Packs count their saved components. */
final class OrderStock {

    private OrderStock() {
    }

    static Map<UUID, Integer> needs(CustomerOrder order) {
        Map<UUID, Integer> map = new TreeMap<>(); // sorted: stock rows are always locked in the same order
        for (OrderItem item : order.getItems()) {
            if (item.getType() == OrderItemType.VARIANT) {
                if (item.getVariantId() != null) {
                    map.merge(item.getVariantId(), item.getQuantity(), Integer::sum);
                }
            } else {
                for (OrderItemComponent c : item.getComponents()) {
                    if (c.getVariantId() != null) {
                        map.merge(c.getVariantId(), c.getQuantity() * item.getQuantity(), Integer::sum);
                    }
                }
            }
        }
        return map;
    }
}