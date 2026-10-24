package com.lunelle.backend;

import com.lunelle.backend.delivery.DeliveryMethod;
import com.lunelle.backend.order.OrderAdminDtos.ChangeStatusRequest;
import com.lunelle.backend.order.OrderDtos.CheckoutRequest;
import com.lunelle.backend.order.OrderDtos.PlacedOrderDto;
import com.lunelle.backend.order.OrderStatus;
import com.lunelle.backend.stats.StatsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class StatsTest extends IntegrationTestBase {

    @Autowired
    private StatsService stats;

    @Test
    void pipelineValueIsGoodsOnlyWithoutDeliveryFees() {
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 10));
        PlacedOrderDto placed = checkout.place(new CheckoutRequest("Test Client", "0551111111", "fr",
                DeliveryMethod.HOME, 16, communeOf(16, 0), "12 rue des Tests", null,
                List.of(variantLine(v, 2)), null));
        assertThat(placed.order().deliveryFee()).isPositive();

        adminOrders.changeStatus(orderIdByCode(placed.order().code()),
                new ChangeStatusRequest(OrderStatus.CONFIRMED, null, null), null);

        var confirmed = stats.overview(null, null).pipeline().confirmed();
        assertThat(confirmed.orders()).isEqualTo(1);
        assertThat(confirmed.amount()).isEqualTo(2000); // 2 x 1,000: no delivery fee
    }
}