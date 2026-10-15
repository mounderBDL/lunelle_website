package com.lunelle.backend.products.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record ProductPageResponse(
    List<ProductResponse> data,
    Pagination pagination
) {
    public record Pagination(
        int page,
        int limit,

        @JsonProperty("total_items")
        long totalItems,

        @JsonProperty("total_pages")
        int totalPages
    ) {
    }
}