package com.lunelle.backend.packs.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public record PackItemResponse(

    UUID id,

    @JsonProperty("product_id")
    UUID productId,

    @JsonProperty("product_name")
    String productName,

    int quantity

) {}