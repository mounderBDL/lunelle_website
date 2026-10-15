package com.lunelle.backend.products.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.lunelle.backend.products.entity.DiscountType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;

public record ProductCreateRequest(

    @NotBlank
    @Size(max = 150)
    String name,

    @NotBlank
    @Size(max = 180)
    @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$")
    String slug,

    @Size(max = 5000)
    String description,

    @NotNull
    @JsonProperty("category_id")
    UUID categoryId,

    @NotNull
    @DecimalMin(value = "0.01")
    BigDecimal price,

    @NotNull
    @DecimalMin(value = "0.00")
    @JsonProperty("cost_price")
    BigDecimal costPrice,

    @NotNull
    @DecimalMin(value = "0.00")
    BigDecimal discount,

    @NotNull
    @JsonProperty("discount_type")
    DiscountType discountType,

    @NotNull
    @DecimalMin(value = "0.00")
    Integer stock

) {}