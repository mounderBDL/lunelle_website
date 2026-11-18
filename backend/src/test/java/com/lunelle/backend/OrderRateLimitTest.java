package com.lunelle.backend;

import com.lunelle.backend.common.CodedException;
import com.lunelle.backend.order.OrderDtos.CheckoutRequest;
import com.lunelle.backend.order.OrderDtos.PlacedOrderDto;
import com.lunelle.backend.order.OrderRateLimiter;
import com.lunelle.backend.delivery.DeliveryMethod;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.catchThrowable;

class OrderRateLimitTest extends IntegrationTestBase {

    private static final String BOT_IP = "203.0.113.7";
    private static final int CAP = OrderRateLimiter.MAX_ORDERS_PER_IP_PER_HOUR;

    private UUID stockedVariant() {
        return variantId(newProduct(newCategory(), "Lune", 2500, 1000, 100));
    }

    /** A different made-up phone each time, so the per-phone limit never applies. */
    private static String phone(int i) {
        return String.format("05510%05d", i);
    }

    private CheckoutRequest order(UUID variant, int i, String key) {
        return new CheckoutRequest("Test Client", phone(i), "fr", DeliveryMethod.HAND_TO_HAND,
                null, null, null, null, List.of(variantLine(variant, 1)), null, key, null);
    }

    @Test
    void oneAddressCannotPlaceUnlimitedOrders() {
        UUID v = stockedVariant();
        for (int i = 0; i < CAP; i++) {
            checkout.place(handToHand(phone(i), variantLine(v, 1)), BOT_IP);
        }
        int stockBefore = stockOf(v);

        Throwable t = catchThrowable(() -> checkout.place(handToHand(phone(CAP), variantLine(v, 1)), BOT_IP));

        assertThat(t).isInstanceOfSatisfying(CodedException.class, e -> {
            assertThat(e.getStatusCode().value()).isEqualTo(429);
            assertThat(e.getCode()).isEqualTo("TOO_MANY_ORDERS");
        });
        assertThat(stockOf(v)).isEqualTo(stockBefore); // nothing was reserved
    }

    @Test
    void otherAddressesAndUnknownOnesAreNotAffected() {
        UUID v = stockedVariant();
        for (int i = 0; i < CAP; i++) {
            checkout.place(handToHand(phone(i), variantLine(v, 1)), BOT_IP);
        }
        assertThatCode(() -> checkout.place(handToHand(phone(90), variantLine(v, 1)), "198.51.100.20"))
                .doesNotThrowAnyException();
        assertThatCode(() -> checkout.place(handToHand(phone(91), variantLine(v, 1)), null))
                .doesNotThrowAnyException();
    }

    @Test
    void aRetryOfTheSameOrderIsNotCounted() {
        UUID v = stockedVariant();
        String key = UUID.randomUUID().toString();
        PlacedOrderDto first = checkout.place(order(v, 0, key), BOT_IP);
        for (int i = 1; i < CAP; i++) {
            checkout.place(handToHand(phone(i), variantLine(v, 1)), BOT_IP);
        }
        // the address is at its cap, but re-sending the first order still returns it
        PlacedOrderDto again = checkout.place(order(v, 0, key), BOT_IP);
        assertThat(again.publicToken()).isEqualTo(first.publicToken());
    }
}
