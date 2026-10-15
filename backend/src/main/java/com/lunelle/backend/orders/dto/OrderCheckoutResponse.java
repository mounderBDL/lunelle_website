package com.lunelle.backend.orders.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderCheckoutResponse(
        @JsonProperty("order_number") String orderNumber,
        @JsonProperty("customer_name") String customerName,
        @JsonProperty("customer_phone") String customerPhone,
        String wilaya,
        String commune,
        @JsonProperty("delivery_method") String deliveryMethod,
        @JsonProperty("delivery_type") String deliveryType,
        @JsonProperty("delivery_office") String deliveryOffice,
        String status,
        List<Item> items,
        BigDecimal subtotal,
        BigDecimal discount,
        @JsonProperty("delivery_fee") BigDecimal deliveryFee,
        BigDecimal total,
        @JsonProperty("created_at") Instant createdAt
) {
    public record Item(
            String type,
            @JsonProperty("item_id") String itemId,
            String name,
            Integer quantity,
            BigDecimal discount,
            BigDecimal total
    ) {}
}
