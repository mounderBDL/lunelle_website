package com.lunelle.backend.packs.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record PackItemCreateRequest(

    @NotNull
    @JsonProperty("product_id")
    UUID productId,

    @Min(1)
    int quantity

) {}