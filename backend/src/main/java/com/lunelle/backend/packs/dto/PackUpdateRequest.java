package com.lunelle.backend.packs.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record PackUpdateRequest(

    @Size(min = 1, max = 200)
    String name,

    @Size(min = 1, max = 220)
    @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$")
    String slug,

    @Size(max = 5000)
    String description,

    @DecimalMin(value = "0.01")
    @Digits(integer = 10, fraction = 2)
    BigDecimal price,

    @JsonProperty("is_active")
    Boolean active

) {}
