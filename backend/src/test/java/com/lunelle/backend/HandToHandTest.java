package com.lunelle.backend;

import com.lunelle.backend.delivery.DeliveryMethod;
import com.lunelle.backend.order.OrderAdminDtos.ChangeStatusRequest;
import com.lunelle.backend.order.OrderAdminDtos.EditOrderRequest;
import com.lunelle.backend.order.OrderAdminDtos.OrderDetailDto;
import com.lunelle.backend.order.OrderAdminDtos.UpdateDetailsRequest;
import com.lunelle.backend.order.OrderDtos.CheckoutRequest;
import com.lunelle.backend.order.OrderDtos.PlacedOrderDto;
import com.lunelle.backend.order.OrderStatus;
import com.lunelle.backend.order.PublicOrderController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HandToHandTest extends IntegrationTestBase {

    @Autowired
    private PublicOrderController publicOrders;

    private UUID newVariant() {
        return variantId(newProduct(newCategory(), "Rose", 1000, 400, 10));
    }

    private CheckoutRequest homeOrder(String phone, UUID variant) {
        return new CheckoutRequest("Test Client", phone, "fr", DeliveryMethod.HOME,
                16, communeOf(16, 0), "12 rue des Tests", null, List.of(variantLine(variant, 1)), null);
    }

    @Test
    void theShopRefusesHandToHandOrders() {
        UUID variant = newVariant();

        assertThatThrownBy(() -> publicOrders.place(handToHand("0551000001", variantLine(variant, 1))))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode().value()).isEqualTo(400));

        assertThat(count("orders")).isZero();
        assertThat(stockOf(variant)).isEqualTo(10);
    }

    @Test
    void homeDeliveryStillWorksFromTheShop() {
        UUID variant = newVariant();

        PlacedOrderDto placed = publicOrders.place(homeOrder("0551000002", variant));

        assertThat(placed.order().deliveryFee()).isPositive();
        assertThat(count("orders")).isEqualTo(1);
        assertThat(stockOf(variant)).isEqualTo(9);
    }

    @Test
    void theAdminCanSwitchANewOrderToHandToHandAfterTheCall() {
        UUID variant = newVariant();
        PlacedOrderDto placed = checkout.place(homeOrder("0551000003", variant));
        UUID id = orderIdByCode(placed.order().code());
        assertThat(placed.order().deliveryFee()).isPositive();

        OrderDetailDto edited = adminOrders.edit(id, new EditOrderRequest("Test Client", "0551000003",
                DeliveryMethod.HAND_TO_HAND, null, null, null, null, List.of(variantLine(variant, 1))), null);

        assertThat(edited.deliveryMethod()).isEqualTo(DeliveryMethod.HAND_TO_HAND);
        assertThat(edited.deliveryFee()).isZero();
        assertThat(edited.wilayaId()).isNull();
        assertThat(edited.communeId()).isNull();
        assertThat(edited.address()).isNull();
        assertThat(edited.total()).isEqualTo(edited.subtotal()).isEqualTo(1000);

        // the meeting place must be set before the order can be confirmed
        assertThatThrownBy(() -> adminOrders.changeStatus(id, new ChangeStatusRequest(OrderStatus.CONFIRMED, null, null), null))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode().value()).isEqualTo(400));

        adminOrders.updateDetails(id, new UpdateDetailsRequest(null, "Didouche Mourad", null, null));
        adminOrders.changeStatus(id, new ChangeStatusRequest(OrderStatus.CONFIRMED, null, null), null);
        assertThat(statusOf(id)).isEqualTo("CONFIRMED");
    }
}