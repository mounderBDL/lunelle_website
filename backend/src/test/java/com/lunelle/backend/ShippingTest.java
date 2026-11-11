package com.lunelle.backend;

import com.lunelle.backend.delivery.DeliveryMethod;
import com.lunelle.backend.order.OrderAdminDtos.ChangeStatusRequest;
import com.lunelle.backend.order.OrderAdminDtos.OrderDetailDto;
import com.lunelle.backend.order.OrderAdminDtos.UpdateDetailsRequest;
import com.lunelle.backend.order.OrderDtos.CheckoutRequest;
import com.lunelle.backend.order.OrderStatus;
import com.lunelle.backend.shipping.ShippingService;
import com.lunelle.backend.shipping.YalidineClient;
import com.lunelle.backend.shipping.YalidineClient.ParcelData;
import com.lunelle.backend.shipping.YalidineException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ShippingTest extends IntegrationTestBase {

    @Autowired
    private ShippingService shipping;

    @MockitoBean
    private YalidineClient yalidine;

    private static ChangeStatusRequest to(OrderStatus status) {
        return new ChangeStatusRequest(status, null, null);
    }

    private UUID homeOrder(OrderStatus upTo) {
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 10));
        var placed = checkout.place(new CheckoutRequest("Amina Ben Ali", "0551111111", "fr",
                DeliveryMethod.HOME, 16, communeOf(16, 0), "12 rue des Tests", null,
                List.of(variantLine(v, 2)), null));
        UUID id = orderIdByCode(placed.order().code());
        if (upTo == OrderStatus.CONFIRMED) {
            adminOrders.changeStatus(id, to(OrderStatus.CONFIRMED), null);
        }
        return id;
    }

    private static void assertStatus(Throwable t, int status) {
        assertThat(t).isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode().value()).isEqualTo(status));
    }

    @Test
    void aConfirmedOrderBecomesAParcelAndIsMarkedShipped() {
        when(yalidine.enabled()).thenReturn(true);
        when(yalidine.createParcel(any(), any())).thenReturn("yal-123");
        UUID id = homeOrder(OrderStatus.CONFIRMED);

        OrderDetailDto sent = shipping.sendToYalidine(id, null);

        assertThat(sent.status()).isEqualTo(OrderStatus.SHIPPED);
        assertThat(sent.trackingNumber()).isEqualTo("yal-123");
        assertThat(jdbc.sql("select carrier from orders where id = :id").param("id", id)
                .query(String.class).single()).isEqualTo("YALIDINE");

        ArgumentCaptor<ParcelData> parcel = ArgumentCaptor.forClass(ParcelData.class);
        verify(yalidine).createParcel(parcel.capture(), any());
        assertThat(parcel.getValue().firstname()).isEqualTo("Amina");
        assertThat(parcel.getValue().familyname()).isEqualTo("Ben Ali");
        assertThat(parcel.getValue().price()).isEqualTo(sent.subtotal());
        assertThat(parcel.getValue().stopDesk()).isFalse();
    }

    @Test
    void onlyConfirmedOrdersAreSent() {
        when(yalidine.enabled()).thenReturn(true);
        UUID id = homeOrder(OrderStatus.NEW);

        assertThatThrownBy(() -> shipping.sendToYalidine(id, null)).satisfies(t -> assertStatus(t, 409));
        verify(yalidine, never()).createParcel(any(), any());
        assertThat(statusOf(id)).isEqualTo("NEW");
    }

    @Test
    void whenYalidineRefusesTheOrderStaysConfirmed() {
        when(yalidine.enabled()).thenReturn(true);
        when(yalidine.createParcel(any(), any()))
                .thenThrow(new YalidineException(HttpStatus.BAD_REQUEST, "Yalidine refused the parcel: wrong commune"));
        UUID id = homeOrder(OrderStatus.CONFIRMED);

        assertThatThrownBy(() -> shipping.sendToYalidine(id, null))
                .hasMessageContaining("wrong commune");
        assertThat(statusOf(id)).isEqualTo("CONFIRMED");
    }

    @Test
    void nothingIsSentWhenYalidineIsNotSetUp() {
        when(yalidine.enabled()).thenReturn(false);
        UUID id = homeOrder(OrderStatus.CONFIRMED);

        assertThatThrownBy(() -> shipping.sendToYalidine(id, null)).satisfies(t -> assertStatus(t, 409));
        verify(yalidine, never()).createParcel(any(), any());
    }

    @Test
    void handToHandOrdersAreNotSentToYalidine() {
        when(yalidine.enabled()).thenReturn(true);
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 10));
        UUID id = orderIdByCode(checkout.place(handToHand("0552222222", variantLine(v, 1))).order().code());
        adminOrders.updateDetails(id, new UpdateDetailsRequest(null, "Blida", null, null));
        adminOrders.changeStatus(id, to(OrderStatus.CONFIRMED), null);

        assertThatThrownBy(() -> shipping.sendToYalidine(id, null)).satisfies(t -> assertStatus(t, 400));
        verify(yalidine, never()).createParcel(any(), any());
    }
}
