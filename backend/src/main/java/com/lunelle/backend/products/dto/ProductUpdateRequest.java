package com.lunelle.backend.products.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.lunelle.backend.products.entity.DiscountType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;

public record ProductUpdateRequest(

    @Size(min = 1, max = 150)
    String name,

    @Size(min = 1, max = 180)
    @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$")
    String slug,

    @Size(max = 5000)
    String description,

    @JsonProperty("category_id")
    UUID categoryId,

    @DecimalMin("0.01")
    BigDecimal price,

    @JsonProperty("cost_price")
    @DecimalMin("0.00")
    BigDecimal costPrice,

    @DecimalMin("0.00")
    BigDecimal discount,

    @JsonProperty("discount_type")
    DiscountType discountType,

    @DecimalMin("0.00")
    Integer stock

) {}
