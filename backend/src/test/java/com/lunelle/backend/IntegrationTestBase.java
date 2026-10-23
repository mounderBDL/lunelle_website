package com.lunelle.backend;

import com.lunelle.backend.catalog.CatalogDtos.*;
import com.lunelle.backend.catalog.CategoryService;
import com.lunelle.backend.catalog.PackService;
import com.lunelle.backend.catalog.ProductService;
import com.lunelle.backend.delivery.DeliveryMethod;
import com.lunelle.backend.order.CheckoutService;
import com.lunelle.backend.order.OrderAdminService;
import com.lunelle.backend.order.OrderDtos.CartLineRequest;
import com.lunelle.backend.order.OrderDtos.CheckoutRequest;
import com.lunelle.backend.order.OrderItemType;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.UUID;

/**
 * Real PostgreSQL, real services, no mocks. Runs ONLY against the lunelle_test database:
 * every test starts from an empty catalog and empty orders.
 */
@SpringBootTest
@ActiveProfiles("test")
abstract class IntegrationTestBase {

    @Autowired
    protected JdbcClient jdbc;
    @Autowired
    protected CategoryService categories;
    @Autowired
    protected ProductService products;
    @Autowired
    protected PackService packs;
    @Autowired
    protected CheckoutService checkout;
    @Autowired
    protected OrderAdminService adminOrders;

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @BeforeEach
    void cleanDatabase() {
        if (!datasourceUrl.endsWith("/lunelle_test")) {
            throw new IllegalStateException("Refusing to run tests against " + datasourceUrl
                    + " (expected a URL ending in /lunelle_test)");
        }
        jdbc.sql("TRUNCATE TABLE stock_movement, order_status_history, order_item_component, order_item, "
                + "orders, pack_item, pack, product_image, product_variant, product, category, blocked_phone CASCADE")
                .update();
        jdbc.sql("ALTER SEQUENCE order_code_seq RESTART WITH 1").update();
        jdbc.sql("update commune set has_office = false").update();
    }

    // ───── fixtures ─────

    protected UUID newCategory() {
        return categories.create(new CategoryRequest(
                new LocalizedName("Category", "Categorie"), null, null, 0, true)).id();
    }

    /** A product with a single size "100 ml". */
    protected AdminProductDto newProduct(UUID categoryId, String name, int price, int cost, int stock) {
        return products.create(new CreateProductRequest(categoryId, new LocalizedName(name, name),
                null, null, null, true, false, 0,
                List.of(new CreateVariantRequest("100 ml", null, price, cost, stock, true, 0))), null);
    }

    protected UUID variantId(AdminProductDto product) {
        return product.variants().get(0).id();
    }

    protected CartLineRequest variantLine(UUID variantId, int quantity) {
        return new CartLineRequest(OrderItemType.VARIANT, variantId, quantity);
    }

    protected CheckoutRequest handToHand(String phone, CartLineRequest... lines) {
        return new CheckoutRequest("Test Client", phone, "fr", DeliveryMethod.HAND_TO_HAND,
                null, null, null, null, List.of(lines), null);
    }

    // ───── queries ─────

    protected int stockOf(UUID variantId) {
        return jdbc.sql("select stock from product_variant where id = :id")
                .param("id", variantId).query(Integer.class).single();
    }

    protected long count(String table) {
        return jdbc.sql("select count(*) from " + table).query(Long.class).single();
    }

    protected UUID orderIdByCode(String code) {
        return jdbc.sql("select id from orders where code = :code").param("code", code)
                .query((rs, n) -> rs.getObject(1, UUID.class)).single();
    }

    protected String statusOf(UUID orderId) {
        return jdbc.sql("select status from orders where id = :id").param("id", orderId)
                .query(String.class).single();
    }
    protected int communeOf(int wilayaId, int index) {
        return jdbc.sql("select id from commune where wilaya_id = :w and is_active order by id limit 1 offset :i")
                .param("w", wilayaId).param("i", index).query(Integer.class).single();
    }

    protected boolean isOffice(int communeId) {
        return jdbc.sql("select has_office from commune where id = :id")
                .param("id", communeId).query(Boolean.class).single();
    }

    protected long countOffices(int wilayaId) {
        return jdbc.sql("select count(*) from commune where wilaya_id = :w and has_office")
                .param("w", wilayaId).query(Long.class).single();
    }
}
