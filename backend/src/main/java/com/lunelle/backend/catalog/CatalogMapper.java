package com.lunelle.backend.catalog;

import com.lunelle.backend.catalog.CatalogDtos.*;

import java.time.Instant;
import java.util.List;

final class CatalogMapper {

    private CatalogMapper() {
    }

    static LocalizedName name(String en, String fr) {
        return new LocalizedName(en, fr);
    }

    static LocalizedText text(String en, String fr) {
        return new LocalizedText(en, fr);
    }

    static CategoryDto category(Category c) {
        return new CategoryDto(c.getId(), c.getSlug(), name(c.getNameEn(), c.getNameFr()),
                text(c.getDescriptionEn(), c.getDescriptionFr()), c.getImageUrl(),
                c.getSortOrder(), c.isActive(), c.isRequiresFollowUp());
    }

    static PublicCategoryDto publicCategory(Category c) {
        return new PublicCategoryDto(c.getId(), c.getSlug(), name(c.getNameEn(), c.getNameFr()),
                text(c.getDescriptionEn(), c.getDescriptionFr()), c.getImageUrl());
    }

    static AdminVariantDto adminVariant(Product p, ProductVariant v, Instant now) {
        return new AdminVariantDto(v.getId(), v.getLabel(), v.getSku(), v.getPrice(),
                Pricing.finalPrice(p, v.getPrice(), now), v.getStock(), v.getStock() > 0,
                v.isActive(), v.getSortOrder());
    }

    static AdminProductDto adminProduct(Product p, Category c, Instant now) {
        List<AdminVariantDto> variants = p.getVariants().stream()
                .map(v -> adminVariant(p, v, now))
                .toList();
        DiscountDto discount = new DiscountDto(p.isDiscountActive(), Pricing.discountEffective(p, now),
                p.getDiscountType(), p.getDiscountValue(), p.getDiscountStartsAt(), p.getDiscountEndsAt());
        return new AdminProductDto(p.getId(), p.getSlug(), c.getId(),
                name(c.getNameEn(), c.getNameFr()),
                name(p.getNameEn(), p.getNameFr()),
                text(p.getDescriptionEn(), p.getDescriptionFr()),
                text(p.getScentNotesEn(), p.getScentNotesFr()),
                p.getBadge(), p.isActive(), p.isFeatured(), p.getSortOrder(),
                p.getArchivedAt() != null, discount,
                variants.stream().anyMatch(v -> v.active() && v.inStock()),
                variants, p.getCreatedAt());
    }

    static PublicProductDto publicProduct(Product p, Category c, Instant now) {
        List<PublicVariantDto> variants = p.getVariants().stream()
                .filter(ProductVariant::isActive)
                .map(v -> new PublicVariantDto(v.getId(), v.getLabel(), v.getPrice(),
                        Pricing.finalPrice(p, v.getPrice(), now), v.getStock() > 0))
                .toList();
        boolean onSale = variants.stream().anyMatch(v -> v.finalPrice() < v.price());
        boolean inStock = variants.stream().anyMatch(PublicVariantDto::inStock);
        return new PublicProductDto(p.getId(), p.getSlug(), c.getSlug(),
                name(p.getNameEn(), p.getNameFr()),
                text(p.getDescriptionEn(), p.getDescriptionFr()),
                text(p.getScentNotesEn(), p.getScentNotesFr()),
                p.getBadge(), p.isFeatured(), onSale, inStock, variants);
    }
}
