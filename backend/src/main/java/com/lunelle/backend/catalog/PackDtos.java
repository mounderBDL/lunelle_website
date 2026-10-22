package com.lunelle.backend.catalog;

import com.lunelle.backend.catalog.CatalogDtos.LocalizedName;
import com.lunelle.backend.catalog.CatalogDtos.LocalizedText;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class PackDtos {

    private PackDtos() {
    }

    public record PackItemRequest(
            @NotNull UUID variantId,
            @NotNull @Min(1) @Max(20) Integer quantity) {
    }

    public record PackRequest(
            @NotNull @Valid LocalizedName name,
            @Valid LocalizedText description,
            @Size(max = 500) @Pattern(regexp = "^(https?://\\S+)?$", message = "must be a valid http(s) address, or empty") String imageUrl,
            @NotNull @Min(1) @Max(10_000_000) Integer price,
            @NotNull Boolean active,
            @NotNull Integer sortOrder,
            @NotEmpty @Size(max = 10) List<@Valid PackItemRequest> items) {
    }

    public record AdminPackItemDto(
            UUID variantId, UUID productId, LocalizedName productName, String variantLabel,
            int quantity, int unitPrice, int stock, boolean available) {
    }

    public record AdminPackDto(
            UUID id, String slug, LocalizedName name, LocalizedText description, String imageUrl,
            int price, int individualTotal, int saving, Integer cost, Integer margin,
            boolean active, boolean archived, int sortOrder, int availableUnits, boolean inStock,
            List<AdminPackItemDto> items, Instant createdAt) {
    }

    public record PublicPackItemDto(
            String productSlug, LocalizedName productName, String variantLabel,
            int quantity, String imageUrl) {
    }

    public record PublicPackDto(
            UUID id, String slug, LocalizedName name, LocalizedText description, String imageUrl,
            int price, int individualTotal, int saving, boolean inStock,
            List<PublicPackItemDto> items) {
    }
}