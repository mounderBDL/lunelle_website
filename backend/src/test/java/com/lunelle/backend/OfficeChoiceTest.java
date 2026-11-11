package com.lunelle.backend;

import com.lunelle.backend.delivery.DeliveryMethod;
import com.lunelle.backend.order.OrderDtos.CartLineRequest;
import com.lunelle.backend.order.OrderDtos.CheckoutRequest;
import com.lunelle.backend.order.OrderDtos.PlacedOrderDto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** A commune can have several Yalidine offices: with one it is used, with several the customer must pick. */
class OfficeChoiceTest extends IntegrationTestBase {

    private int commune;
    private int otherCommune;
    private UUID variant;

    @BeforeEach
    void communesWithOffices() {
        commune = communeOf(16, 0);
        otherCommune = communeOf(16, 1);
        for (int id : new int[]{commune, otherCommune}) {
            jdbc.sql("update commune set has_office = true where id = :id").param("id", id).update();
        }
        variant = variantId(newProduct(newCategory(), "Rose", 1000, 400, 10));
    }

    @AfterEach
    void cleanUp() {
        jdbc.sql("delete from commune_office where id >= 900001").update();
        for (int id : new int[]{commune, otherCommune}) {
            jdbc.sql("update commune set has_office = false where id = :id").param("id", id).update();
        }
    }

    private void office(int id, int communeId, String name, String address) {
        jdbc.sql("insert into commune_office (id, commune_id, name, address) values (:id, :c, :n, :a)")
                .param("id", id).param("c", communeId).param("n", name).param("a", address).update();
    }

    private CheckoutRequest order(Integer officeId) {
        return new CheckoutRequest("Test Client", "0551111111", "fr", DeliveryMethod.STOP_DESK, 16, commune, null,
                null, List.of(variantLine(variant, 1)), null, null, officeId);
    }

    private Integer storedOffice(PlacedOrderDto placed) {
        return jdbc.sql("select office_id from orders where code = :c").param("c", placed.order().code())
                .query(Integer.class).single();
    }

    @Test
    void anOfficeIsRequiredWhenTheCommuneHasSeveral() {
        office(900001, commune, "Agence Ali Mendjeli", "Nouvelle ville");
        office(900002, commune, "Agence El Khroub", "Centre");

        assertThatThrownBy(() -> checkout.place(order(null))).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void theChosenOfficeIsSavedAndShownAsTheAddress() {
        office(900001, commune, "Agence Ali Mendjeli", "Nouvelle ville");
        office(900002, commune, "Agence El Khroub", "Centre");

        PlacedOrderDto placed = checkout.place(order(900002));

        assertThat(storedOffice(placed)).isEqualTo(900002);
        assertThat(placed.order().address()).isEqualTo("Agence El Khroub - Centre");
    }

    @Test
    void aSingleOfficeIsUsedWithoutAsking() {
        office(900001, commune, "Agence Unique", null);

        PlacedOrderDto placed = checkout.place(order(null));

        assertThat(storedOffice(placed)).isEqualTo(900001);
        assertThat(placed.order().address()).isEqualTo("Agence Unique");
    }

    @Test
    void anOfficeOfAnotherCommuneIsRefused() {
        office(900001, commune, "Agence A", null);
        office(900002, commune, "Agence B", null);
        office(900003, otherCommune, "Agence Ailleurs", null);

        assertThatThrownBy(() -> checkout.place(order(900003))).isInstanceOf(ResponseStatusException.class);
    }
}
