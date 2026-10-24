package com.lunelle.backend.catalog;

import java.time.Instant;

/** Single source of truth for discounted prices (storefront, cart and checkout all use it). */
public final class Pricing {

    private Pricing() {
    }

    public static boolean discountEffective(Product p, Instant now) {
        if (!p.isDiscountActive() || p.getDiscountType() == null || p.getDiscountValue() == null) {
            return false;
        }
        if (p.getDiscountStartsAt() != null && now.isBefore(p.getDiscountStartsAt())) {
            return false;
        }
        return p.getDiscountEndsAt() == null || now.isBefore(p.getDiscountEndsAt());
    }

    public static int finalPrice(Product p, int basePrice, Instant now) {
        if (!discountEffective(p, now)) {
            return basePrice;
        }
        long discount = switch (p.getDiscountType()) {
            case PERCENT -> ((long) basePrice * p.getDiscountValue() + 50) / 100; // rounded to the dinar
            case FIXED -> p.getDiscountValue();
        };
        return (int) Math.max(0, basePrice - discount);
    }

    /** What one pack costs the business, or null when any component has no cost price yet. */
    public static Integer packCost(Pack pack) {
        long total = 0;
        for (PackItem item : pack.getItems()) {
            Integer cost = item.getVariant().getCostPrice();
            if (cost == null) {
                return null;
            }
            total += (long) cost * item.getQuantity();
        }
        return (int) total;
    }

    /** The most units of one item that can be ordered (shop, cart and admin editing share it). */
    public static final int MAX_PER_ITEM = 10;
}