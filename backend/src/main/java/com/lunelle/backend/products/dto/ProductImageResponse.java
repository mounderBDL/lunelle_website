package com.lunelle.backend.products.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public record ProductImageResponse(
    UUID id,

    @JsonProperty("image_url")
    String imageUrl,

    @JsonProperty("is_primary")
    boolean primary,

    @JsonProperty("display_order")
    int displayOrder
) {
}
