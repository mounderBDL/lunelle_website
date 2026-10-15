package com.lunelle.backend.products.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.lunelle.backend.products.entity.DiscountType;
import java.math.BigDecimal;
import java.util.UUID;

public record ProductResponse(
    UUID id,
    String name,
    String slug,
    String description,
    BigDecimal price,
    BigDecimal discount,

    @JsonProperty("discount_type")
    DiscountType discountType,

    @JsonProperty("effective_price")
    BigDecimal effectivePrice,

    CategorySummary category
) {
    public record CategorySummary(
        UUID id,
        String name,
        String slug
    ) {
    }
}
