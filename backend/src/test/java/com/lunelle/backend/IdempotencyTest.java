package com.lunelle.backend;

import com.lunelle.backend.delivery.DeliveryMethod;
import com.lunelle.backend.order.OrderDtos.CartLineRequest;
import com.lunelle.backend.order.OrderDtos.CheckoutRequest;
import com.lunelle.backend.order.OrderDtos.PlacedOrderDto;
import com.lunelle.backend.order.PublicOrderController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IdempotencyTest extends IntegrationTestBase {

    @Autowired
    private PublicOrderController publicOrders;

    private UUID newVariant() {
        return variantId(newProduct(newCategory(), "Rose", 1000, 400, 10));
    }

    private CheckoutRequest order(String phone, UUID variant, String key) {
        return new CheckoutRequest("Test Client", phone, "fr", DeliveryMethod.HOME, 16, communeOf(16, 0),
                "12 rue des Tests", null, List.<CartLineRequest>of(variantLine(variant, 1)), null, key);
    }

    @Test
    void sendingTheSameOrderTwiceCreatesOnlyOne() {
        UUID variant = newVariant();
        String key = UUID.randomUUID().toString();

        PlacedOrderDto first = publicOrders.place(order("0551000010", variant, key));
        PlacedOrderDto again = publicOrders.place(order("0551000010", variant, key));

        assertThat(again.publicToken()).isEqualTo(first.publicToken());
        assertThat(again.order().code()).isEqualTo(first.order().code());
        assertThat(count("orders")).isEqualTo(1);
        assertThat(stockOf(variant)).isEqualTo(9); // taken from stock once
    }

    @Test
    void differentKeysOrNoKeyStillMeanDifferentOrders() {
        UUID variant = newVariant();

        publicOrders.place(order("0551000011", variant, UUID.randomUUID().toString()));
        publicOrders.place(order("0551000011", variant, UUID.randomUUID().toString()));
        publicOrders.place(order("0551000011", variant, null));

        assertThat(count("orders")).isEqualTo(3);
        assertThat(stockOf(variant)).isEqualTo(7);
    }

    @Test
    void aKeyCannotBeReusedByAnotherCustomer() {
        UUID variant = newVariant();
        String key = UUID.randomUUID().toString();
        publicOrders.place(order("0551000012", variant, key));

        assertThatThrownBy(() -> publicOrders.place(order("0551000013", variant, key)))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode().value()).isEqualTo(400));
        assertThat(count("orders")).isEqualTo(1);
    }

    @Test
    void twoIdenticalRequestsAtTheSameTimeCreateOnlyOneOrder() throws Exception {
        UUID variant = newVariant();
        String key = UUID.randomUUID().toString();
        CheckoutRequest request = order("0551000014", variant, key);

        CountDownLatch go = new CountDownLatch(1);
        Callable<PlacedOrderDto> call = () -> {
            go.await();
            return publicOrders.place(request);
        };
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<PlacedOrderDto> a = pool.submit(call);
            Future<PlacedOrderDto> b = pool.submit(call);
            go.countDown();
            assertThat(a.get().order().code()).isEqualTo(b.get().order().code());
        } finally {
            pool.shutdownNow();
        }
        assertThat(count("orders")).isEqualTo(1);
        assertThat(stockOf(variant)).isEqualTo(9);
    }
}