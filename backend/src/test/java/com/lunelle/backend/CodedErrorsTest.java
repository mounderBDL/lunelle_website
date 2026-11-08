package com.lunelle.backend;

import com.lunelle.backend.common.ApiExceptionHandler;
import com.lunelle.backend.common.CodedException;
import com.lunelle.backend.delivery.DeliveryMethod;
import com.lunelle.backend.order.OrderDtos.CheckoutRequest;
import com.lunelle.backend.order.PublicOrderController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

class CodedErrorsTest extends IntegrationTestBase {

    @Autowired
    private PublicOrderController publicOrders;

    private CodedException failure(CheckoutRequest request) {
        Throwable t = catchThrowable(() -> publicOrders.place(request));
        assertThat(t).isInstanceOf(CodedException.class);
        return (CodedException) t;
    }

    @Test
    void theShopGetsAStableCodeForEachCheckoutMistake() {
        UUID variant = variantId(newProduct(newCategory(), "Rose", 1000, 400, 1));

        // no wilaya chosen for home delivery
        assertThat(failure(new CheckoutRequest("Test Client", "0551000020", "fr", DeliveryMethod.HOME,
                null, null, "12 rue des Tests", null, List.of(variantLine(variant, 1)), null)).getCode())
                .isEqualTo("WILAYA_REQUIRED");

        // not a phone number
        assertThat(failure(new CheckoutRequest("Test Client", "abc", "fr", DeliveryMethod.HOME,
                16, communeOf(16, 0), "12 rue des Tests", null, List.of(variantLine(variant, 1)), null)).getCode())
                .isEqualTo("PHONE_INVALID");

        // hand-to-hand is not offered in the shop
        assertThat(failure(handToHand("0551000021", variantLine(variant, 1))).getCode())
                .isEqualTo("DELIVERY_METHOD_NOT_ALLOWED");

        // more than what is in stock: the code carries the product names
        CodedException unavailable = failure(new CheckoutRequest("Test Client", "0551000022", "fr",
                DeliveryMethod.HOME, 16, communeOf(16, 0), "12 rue des Tests", null,
                List.of(variantLine(variant, 2)), null));
        assertThat(unavailable.getCode()).isEqualTo("ITEMS_UNAVAILABLE");
        assertThat(unavailable.getParams().get("names")).contains("Rose");
    }

    @Test
    void theErrorBodyCarriesTheCodeAndTheParameters() {
        var response = new ApiExceptionHandler().coded(
                new CodedException(HttpStatus.BAD_REQUEST, "MAX_PER_ITEM", "Maximum 10 per item", Map.of("max", "10")));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).containsEntry("message", "Maximum 10 per item")
                .containsEntry("code", "MAX_PER_ITEM")
                .containsEntry("params", Map.of("max", "10"));
    }
}