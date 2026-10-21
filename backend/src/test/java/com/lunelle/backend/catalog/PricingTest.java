package com.lunelle.backend.catalog;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class PricingTest {

    private static final Instant NOW = Instant.parse("2026-10-20T12:00:00Z");

    private static Product withDiscount(DiscountType type, int value) {
        Product p = new Product();
        p.setDiscountActive(true);
        p.setDiscountType(type);
        p.setDiscountValue(value);
        return p;
    }

    @Test
    void noDiscountKeepsThePrice() {
        assertThat(Pricing.finalPrice(new Product(), 1200, NOW)).isEqualTo(1200);
    }

    @Test
    void percentDiscount() {
        assertThat(Pricing.finalPrice(withDiscount(DiscountType.PERCENT, 20), 2000, NOW)).isEqualTo(1600);
    }

    @Test
    void percentDiscountRoundsToTheNearestDinar() {
        // 15% of 999 = 149.85 -> 150
        assertThat(Pricing.finalPrice(withDiscount(DiscountType.PERCENT, 15), 999, NOW)).isEqualTo(849);
    }

    @Test
    void fixedDiscount() {
        assertThat(Pricing.finalPrice(withDiscount(DiscountType.FIXED, 300), 2000, NOW)).isEqualTo(1700);
    }

    @Test
    void priceNeverGoesBelowZero() {
        assertThat(Pricing.finalPrice(withDiscount(DiscountType.FIXED, 5000), 1000, NOW)).isZero();
    }

    @Test
    void inactiveDiscountIsIgnored() {
        Product p = withDiscount(DiscountType.PERCENT, 50);
        p.setDiscountActive(false);
        assertThat(Pricing.finalPrice(p, 1000, NOW)).isEqualTo(1000);
    }

    @Test
    void discountOnlyAppliesInsideItsDateWindow() {
        Product notStarted = withDiscount(DiscountType.PERCENT, 50);
        notStarted.setDiscountStartsAt(NOW.plusSeconds(60));
        assertThat(Pricing.finalPrice(notStarted, 1000, NOW)).isEqualTo(1000);

        Product expired = withDiscount(DiscountType.PERCENT, 50);
        expired.setDiscountEndsAt(NOW); // the end instant itself is already outside
        assertThat(Pricing.finalPrice(expired, 1000, NOW)).isEqualTo(1000);

        Product running = withDiscount(DiscountType.PERCENT, 50);
        running.setDiscountStartsAt(NOW.minusSeconds(60));
        running.setDiscountEndsAt(NOW.plusSeconds(60));
        assertThat(Pricing.finalPrice(running, 1000, NOW)).isEqualTo(500);
    }
}