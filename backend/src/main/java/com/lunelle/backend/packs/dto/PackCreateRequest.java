package com.lunelle.backend.packs.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public record PackCreateRequest(

    @NotBlank
    @Size(max = 200)
    String name,

    @NotBlank
    @Size(max = 220)
    @Pattern(
        regexp = "[a-z0-9]+(?:-[a-z0-9]+)*",
        message = "Slug must contain lowercase letters, numbers, and single hyphens."
    )
    String slug,

    String description,

    @NotNull
    @DecimalMin(value = "0.00", inclusive = false)
    @Digits(integer = 10, fraction = 2)
    BigDecimal price,

    @NotEmpty
    @Valid
    @JsonProperty("items")
    List<PackItemCreateRequest> items

) {}