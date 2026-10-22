package com.lunelle.backend.catalog;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class CatalogDtos {

    private CatalogDtos() {
    }

    // ───── shared ─────
    public record LocalizedName(
            @NotBlank @Size(max = 150) String en,
            @NotBlank @Size(max = 150) String fr) {
    }

    public record LocalizedText(
            @Size(max = 5000) String en,
            @Size(max = 5000) String fr) {
    }

    // ───── categories ─────
    public record CategoryRequest(
            @NotNull @Valid LocalizedName name,
            @Valid LocalizedText description,
            @Size(max = 500) @Pattern(regexp = "^(https?://\\S+)?$", message = "must be a valid http(s) address, or empty") String imageUrl,
            @NotNull Integer sortOrder,
            @NotNull Boolean active,
            @NotNull Boolean requiresFollowUp) {
    }

    public record CategoryDto(
            UUID id, String slug, LocalizedName name, LocalizedText description,
            String imageUrl, int sortOrder, boolean active, boolean requiresFollowUp) {
    }

    public record PublicCategoryDto(
            UUID id, String slug, LocalizedName name, LocalizedText description, String imageUrl,
            boolean requiresFollowUp) {
    }

    // ───── variants ─────
    public record CreateVariantRequest(
            @NotBlank @Size(max = 50) String label,
            @Size(max = 60) String sku,
            @NotNull @Min(0) @Max(10_000_000) Integer price,
            @NotNull @Min(0) @Max(10_000_000) Integer costPrice,
            @NotNull @Min(0) @Max(100_000) Integer initialStock,
            @NotNull Boolean active,
            @NotNull Integer sortOrder) {
    }

    public record UpdateVariantRequest(
            @NotBlank @Size(max = 50) String label,
            @Size(max = 60) String sku,
            @NotNull @Min(0) @Max(10_000_000) Integer price,
            @NotNull @Min(0) @Max(10_000_000) Integer costPrice,
            @NotNull Boolean active,
            @NotNull Integer sortOrder) {
    }

    // ───── products ─────
    public record CreateProductRequest(
            @NotNull UUID categoryId,
            @NotNull @Valid LocalizedName name,
            @Valid LocalizedText description,
            @Valid LocalizedText scentNotes,
            @Size(max = 30) String badge,
            @NotNull Boolean active,
            @NotNull Boolean featured,
            @NotNull Integer sortOrder,
            @NotEmpty List<@Valid CreateVariantRequest> variants) {
    }

    public record UpdateProductRequest(
            @NotNull UUID categoryId,
            @NotNull @Valid LocalizedName name,
            @Valid LocalizedText description,
            @Valid LocalizedText scentNotes,
            @Size(max = 30) String badge,
            @NotNull Boolean active,
            @NotNull Boolean featured,
            @NotNull Integer sortOrder) {
    }

    public record DiscountRequest(
            @NotNull Boolean active,
            DiscountType type,
            @Min(1) Integer value,
            Instant startsAt,
            Instant endsAt) {
    }

    public record DiscountDto(
            boolean active, boolean effective, DiscountType type, Integer value,
            Instant startsAt, Instant endsAt) {
    }

    public record AdminVariantDto(
            UUID id, String label, String sku, int price, int finalPrice,
            Integer costPrice, Integer margin,
            int stock, boolean inStock, boolean active, int sortOrder) {
    }

    public record AdminProductDto(
                UUID id, String slug, UUID categoryId, LocalizedName categoryName,
                LocalizedName name, LocalizedText description, LocalizedText scentNotes,
                String badge, boolean active, boolean featured, int sortOrder, boolean archived,
                DiscountDto discount, boolean inStock, List<AdminVariantDto> variants,
                List<ImageDto> images, Instant createdAt) {
        }

    // ───── storefront ─────
    public record PublicVariantDto(UUID id, String label, int price, int finalPrice, boolean inStock) {
    }

    public record PublicProductDto(
            UUID id, String slug, String categorySlug, LocalizedName name,
            LocalizedText description, LocalizedText scentNotes, String badge,
            boolean featured, boolean onSale, boolean inStock, boolean personalized,
            List<PublicVariantDto> variants, List<ImageDto> images) {
    }

    // ───── stock ─────
    public record StockChangeRequest(
            @NotNull @Min(-100_000) @Max(100_000) Integer delta,
            @NotNull StockReason reason,
            @Size(max = 500) String note) {
    }

    public record StockResultDto(UUID variantId, int stock) {
    }

    public record StockMovementDto(
            UUID id, int delta, int stockAfter, StockReason reason,
            UUID orderId, String note, Instant createdAt) {
    }

    public record ImageDto(UUID id, String url) {
    }

    public record ReorderImagesRequest(@NotEmpty List<UUID> imageIds) {
    }

    public record UploadDto(String url, String publicId) {
    }
}