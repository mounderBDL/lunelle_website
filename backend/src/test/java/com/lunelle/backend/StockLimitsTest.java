package com.lunelle.backend;

import com.lunelle.backend.catalog.CatalogDtos.AdminProductDto;
import com.lunelle.backend.delivery.DeliveryMethod;
import com.lunelle.backend.order.OrderDtos.QuoteDto;
import com.lunelle.backend.order.OrderDtos.QuoteRequest;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class StockLimitsTest extends IntegrationTestBase {

    @Test
    void quoteLinesReportHowManyCanStillBeBought() {
        UUID few = variantId(newProduct(newCategory(), "Rose", 1000, 400, 4));
        UUID many = variantId(newProduct(newCategory(), "Oud", 1000, 400, 50));

        QuoteDto quote = checkout.quote(new QuoteRequest(
                List.of(variantLine(few, 1), variantLine(many, 1)), DeliveryMethod.HAND_TO_HAND, null));

        assertThat(quote.lines()).extracting("available").containsExactlyInAnyOrder(4, 10);
    }

    @Test
    void storefrontProductsReportAPurchasableQuantityCappedAtTen() {
        AdminProductDto few = newProduct(newCategory(), "Rose", 1000, 400, 4);
        AdminProductDto many = newProduct(newCategory(), "Oud", 1000, 400, 50);

        assertThat(products.getPublic(few.slug()).variants().get(0).maxQuantity()).isEqualTo(4);
        assertThat(products.getPublic(many.slug()).variants().get(0).maxQuantity()).isEqualTo(10);
    }
}