package com.lunelle.backend;

import com.lunelle.backend.catalog.CatalogDtos.AdminProductDto;
import com.lunelle.backend.catalog.CatalogDtos.LocalizedName;
import com.lunelle.backend.catalog.CatalogDtos.UpdateVariantRequest;
import com.lunelle.backend.catalog.PackDtos.AdminPackDto;
import com.lunelle.backend.catalog.PackDtos.PackItemRequest;
import com.lunelle.backend.catalog.PackDtos.PackRequest;
import com.lunelle.backend.delivery.DeliveryMethod;
import com.lunelle.backend.order.OrderAdminDtos.ChangeStatusRequest;
import com.lunelle.backend.order.OrderAdminDtos.EditOrderRequest;
import com.lunelle.backend.order.OrderAdminDtos.OrderDetailDto;
import com.lunelle.backend.order.OrderAdminDtos.UpdateDetailsRequest;
import com.lunelle.backend.order.OrderDtos.CartLineRequest;
import com.lunelle.backend.order.OrderDtos.CheckoutRequest;
import com.lunelle.backend.order.OrderDtos.PlacedOrderDto;
import com.lunelle.backend.order.OrderItemType;
import com.lunelle.backend.order.OrderStatus;
import com.lunelle.backend.order.OrderQueryService;

import com.lunelle.backend.order.OrderAdminDtos.RestockItem;
import com.lunelle.backend.order.OrderAdminDtos.RestockRequest;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrderFlowTest extends IntegrationTestBase {

    private static ChangeStatusRequest to(OrderStatus status) {
        return new ChangeStatusRequest(status, null, null);
    }

    private static void assertHttp(Throwable t, int expected) {
        assertThat(t).isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode().value()).isEqualTo(expected));
    }

    private CheckoutRequest office(String phone, int wilayaId, int communeId, CartLineRequest... lines) {
        return new CheckoutRequest("Test Client", phone, "fr", DeliveryMethod.STOP_DESK,
                wilayaId, communeId, null, null, List.of(lines), null);
    }    

    @Test
    void placingAnOrderTakesStockSnapshotsPricesAndLogsTheMovement() {
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 10));

        PlacedOrderDto placed = checkout.place(handToHand("0551111111", variantLine(v, 3)));

        assertThat(placed.order().code()).isEqualTo("LN-000001");
        assertThat(placed.order().subtotal()).isEqualTo(3000);
        assertThat(placed.order().deliveryFee()).isZero();
        assertThat(placed.order().total()).isEqualTo(3000);
        assertThat(stockOf(v)).isEqualTo(7);
        assertThat(jdbc.sql("select delta from stock_movement where reason = 'ORDER_PLACED'")
                .query(Integer.class).single()).isEqualTo(-3);
        assertThat(jdbc.sql("select unit_cost from order_item").query(Integer.class).single()).isEqualTo(400);
    }

    @Test
    void cannotOrderMoreThanTheStockAndNothingIsSaved() {
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 1));

        assertThatThrownBy(() -> checkout.place(handToHand("0551111111", variantLine(v, 2))))
                .satisfies(t -> assertHttp(t, 409));

        assertThat(stockOf(v)).isEqualTo(1);
        assertThat(count("orders")).isZero();
    }

    @Test
    void concurrentOrdersNeverOversell() throws Exception {
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 5));
        int threads = 12;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<Boolean>> results = new ArrayList<>();

        for (int i = 0; i < threads; i++) {
            String phone = String.format("0550000%03d", i); // a different customer each time
            results.add(pool.submit(() -> {
                go.await();
                try {
                    checkout.place(handToHand(phone, variantLine(v, 1)));
                    return true;
                } catch (ResponseStatusException e) {
                    return false;
                }
            }));
        }
        go.countDown();
        int successes = 0;
        for (Future<Boolean> f : results) {
            if (f.get(60, TimeUnit.SECONDS)) {
                successes++;
            }
        }
        pool.shutdown();

        assertThat(successes).isEqualTo(5);
        assertThat(stockOf(v)).isZero();
        assertThat(count("orders")).isEqualTo(5);
        assertThat(jdbc.sql("select coalesce(sum(delta), 0) from stock_movement where reason = 'ORDER_PLACED'")
                .query(Long.class).single()).isEqualTo(-5L);
    }

    @Test
    void packOrderTakesStockFromEveryComponentAndSavesThem() {
        UUID cat = newCategory();
        UUID a = variantId(newProduct(cat, "A", 1000, 400, 10));
        UUID b = variantId(newProduct(cat, "B", 500, 200, 10));
        AdminPackDto pack = packs.create(new PackRequest(new LocalizedName("Duo", "Duo"), null, null,
                1500, true, 0, List.of(new PackItemRequest(a, 1), new PackItemRequest(b, 2))));

        PlacedOrderDto placed = checkout.place(handToHand("0551111111",
                new CartLineRequest(OrderItemType.PACK, pack.id(), 2)));

        assertThat(placed.order().total()).isEqualTo(3000);
        assertThat(stockOf(a)).isEqualTo(8);   // 1 per pack x 2 packs
        assertThat(stockOf(b)).isEqualTo(6);   // 2 per pack x 2 packs
        assertThat(count("order_item_component")).isEqualTo(2);
        // pack cost = 1 x 400 + 2 x 200
        assertThat(jdbc.sql("select unit_cost from order_item where type = 'PACK'")
                .query(Integer.class).single()).isEqualTo(800);
    }

    @Test
    void cancellingReturnsTheStockOnlyOnce() {
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 10));
        UUID orderId = orderIdByCode(checkout.place(handToHand("0551111111", variantLine(v, 3))).order().code());
        assertThat(stockOf(v)).isEqualTo(7);

        adminOrders.changeStatus(orderId, to(OrderStatus.CANCELLED), null);
        assertThat(stockOf(v)).isEqualTo(10);

        assertThatThrownBy(() -> adminOrders.changeStatus(orderId, to(OrderStatus.CANCELLED), null))
                .satisfies(t -> assertHttp(t, 409));
        assertThat(stockOf(v)).isEqualTo(10);
    }

    @Test
    void reopeningANoAnswerOrderTakesStockAgainAndFailsWhenSoldOut() {
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 3));
        UUID orderId = orderIdByCode(checkout.place(handToHand("0551111111", variantLine(v, 3))).order().code());
        assertThat(stockOf(v)).isZero();

        adminOrders.changeStatus(orderId, to(OrderStatus.NO_ANSWER), null);
        assertThat(stockOf(v)).isEqualTo(3);

        checkout.place(handToHand("0552222222", variantLine(v, 3))); // someone else buys everything
        assertThat(stockOf(v)).isZero();

        assertThatThrownBy(() -> adminOrders.changeStatus(orderId, to(OrderStatus.NEW), null))
                .satisfies(t -> assertHttp(t, 409));
        assertThat(statusOf(orderId)).isEqualTo("NO_ANSWER"); // the failed attempt changed nothing
    }

    @Test
    void aReturnedOrderDoesNotRestoreStockAutomatically() {
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 10));
        UUID orderId = orderIdByCode(checkout.place(handToHand("0551111111", variantLine(v, 3))).order().code());

        adminOrders.updateDetails(orderId, new UpdateDetailsRequest(null, "Blida", null, null));
        adminOrders.changeStatus(orderId, to(OrderStatus.CONFIRMED), null);
        adminOrders.changeStatus(orderId, to(OrderStatus.DELIVERED), null);
        adminOrders.changeStatus(orderId, to(OrderStatus.RETURNED), null);

        assertThat(stockOf(v)).isEqualTo(7); // the admin restocks manually after checking the bottle
    }

    @Test
    void editingANewOrderKeepsTheOriginalPriceAndAdjustsStock() {
        AdminProductDto product = newProduct(newCategory(), "Rose", 1000, 400, 10);
        UUID v = variantId(product);
        UUID orderId = orderIdByCode(checkout.place(handToHand("0551111111", variantLine(v, 2))).order().code());
        assertThat(stockOf(v)).isEqualTo(8);

        // the price goes up after the customer ordered
        products.updateVariant(v, new UpdateVariantRequest("100 ml", null, 1500, 400, true, 0));

        OrderDetailDto edited = adminOrders.edit(orderId, new EditOrderRequest("Test Client", "0551111111",
                DeliveryMethod.HAND_TO_HAND, null, null, null, null, List.of(variantLine(v, 3))), null);

        assertThat(edited.items().get(0).unitPrice()).isEqualTo(1000); // the price the customer saw
        assertThat(edited.subtotal()).isEqualTo(3000);
        assertThat(stockOf(v)).isEqualTo(7);
        assertThat(jdbc.sql("select delta from stock_movement where reason = 'ORDER_EDITED'")
                .query(Integer.class).single()).isEqualTo(-1);
    }

    @Test
    void homeDeliveryChargesTheWilayaFee() {
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 10));
        int communeId = jdbc.sql("select id from commune where wilaya_id = 16 order by id limit 1")
                .query(Integer.class).optional()
                .orElseGet(() -> jdbc.sql("insert into commune (wilaya_id, name) values (16, 'Test commune') returning id")
                        .query(Integer.class).single());
        int fee = jdbc.sql("select fee from delivery_rate where wilaya_id = 16 and method = 'HOME'")
                .query(Integer.class).single();

        PlacedOrderDto placed = checkout.place(new CheckoutRequest("Test Client", "0551111111", "fr",
                DeliveryMethod.HOME, 16, communeId, "12 rue des Tests", null, List.of(variantLine(v, 1)), null));

        assertThat(placed.order().deliveryFee()).isEqualTo(fee);
        assertThat(placed.order().total()).isEqualTo(1000 + fee);
    }

    @Test
    void blockedPhonesAreRefusedAndOneNumberCannotFloodTheShop() {
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 20));
        jdbc.sql("insert into blocked_phone (phone, reason) values ('0555000111', 'test')").update();

        assertThatThrownBy(() -> checkout.place(handToHand("+213 555 00 01 11", variantLine(v, 1))))
                .satisfies(t -> assertHttp(t, 400));

        for (int i = 0; i < 3; i++) {
            checkout.place(handToHand("0552222222", variantLine(v, 1)));
        }
        assertThatThrownBy(() -> checkout.place(handToHand("0552222222", variantLine(v, 1))))
                .satisfies(t -> assertHttp(t, 429));
    }

 @Test
    void handToHandOrdersCannotBeConfirmedWithoutAMeetingPlace() {
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 5));
        UUID orderId = orderIdByCode(checkout.place(handToHand("0551111111", variantLine(v, 1))).order().code());

        assertThatThrownBy(() -> adminOrders.changeStatus(orderId, to(OrderStatus.CONFIRMED), null))
                .satisfies(t -> assertHttp(t, 400));

        adminOrders.updateDetails(orderId, new UpdateDetailsRequest(null, "Blida, post office", null, null));
        assertThat(adminOrders.changeStatus(orderId, to(OrderStatus.CONFIRMED), null).status())
                .isEqualTo(OrderStatus.CONFIRMED);
    }

    @Test
    void officeDeliveryOnlyAcceptsCommunesWithAnOffice() {
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 10));
        int withOffice = communeOf(16, 0);
        int withoutOffice = communeOf(16, 1);
        jdbc.sql("update commune set has_office = true where id = :id").param("id", withOffice).update();
        int fee = jdbc.sql("select fee from delivery_rate where wilaya_id = 16 and method = 'STOP_DESK'")
                .query(Integer.class).single();

        PlacedOrderDto placed = checkout.place(office("0551111111", 16, withOffice, variantLine(v, 1)));
        assertThat(placed.order().deliveryFee()).isEqualTo(fee);
        assertThat(placed.order().address()).isNull();

        assertThatThrownBy(() -> checkout.place(office("0552222222", 16, withoutOffice, variantLine(v, 1))))
                .satisfies(t -> assertHttp(t, 400));
        assertThat(count("orders")).isEqualTo(1);
    }

    @Autowired
    private OrderQueryService orderQueries;

    @Test
    void lookupNeverRevealsTheStreetAddressButThePrivateLinkDoes() {
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 10));
        int commune = communeOf(16, 0);
        PlacedOrderDto placed = checkout.place(new CheckoutRequest("Test Client", "0551111111", "fr",
                DeliveryMethod.HOME, 16, commune, "12 rue des Tests", null, List.of(variantLine(v, 1)), null));

        assertThat(orderQueries.byToken(placed.publicToken()).address()).isEqualTo("12 rue des Tests");
        assertThat(orderQueries.lookup(placed.order().code(), "+213 551 11 11 11").address()).isNull();
        assertThatThrownBy(() -> orderQueries.lookup(placed.order().code(), "0552222222"))
                .satisfies(t -> assertHttp(t, 404));
    }    

    @Test
    void aReturnedOrderCanBeRestockedOnlyUpToWhatWasOrderedAndNeverTwice() {
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 10));
        UUID orderId = orderIdByCode(checkout.place(handToHand("0551111111", variantLine(v, 3))).order().code());
        adminOrders.updateDetails(orderId, new UpdateDetailsRequest(null, "Blida", null, null));
        adminOrders.changeStatus(orderId, to(OrderStatus.CONFIRMED), null);
        adminOrders.changeStatus(orderId, to(OrderStatus.DELIVERED), null);

        // not returned yet: nothing to put back
        assertThatThrownBy(() -> adminOrders.restockReturned(orderId,
                new RestockRequest(List.of(new RestockItem(v, 1)), null), null))
                .satisfies(t -> assertHttp(t, 409));

        adminOrders.changeStatus(orderId, to(OrderStatus.RETURNED), null);
        assertThat(stockOf(v)).isEqualTo(7); // a return does not restock by itself

        OrderDetailDto detail = adminOrders.get(orderId);
        assertThat(detail.restock()).hasSize(1);
        assertThat(detail.restock().get(0).remaining()).isEqualTo(3);

        adminOrders.restockReturned(orderId, new RestockRequest(List.of(new RestockItem(v, 2)), "checked"), null);
        assertThat(stockOf(v)).isEqualTo(9);

        // 2 more would exceed the 3 ordered
        assertThatThrownBy(() -> adminOrders.restockReturned(orderId,
                new RestockRequest(List.of(new RestockItem(v, 2)), null), null))
                .satisfies(t -> assertHttp(t, 409));
        assertThat(stockOf(v)).isEqualTo(9);

        OrderDetailDto after = adminOrders.restockReturned(orderId,
                new RestockRequest(List.of(new RestockItem(v, 1)), null), null);
        assertThat(stockOf(v)).isEqualTo(10);
        assertThat(after.restock().get(0).remaining()).isZero();

        assertThatThrownBy(() -> adminOrders.restockReturned(orderId,
                new RestockRequest(List.of(new RestockItem(v, 1)), null), null))
                .satisfies(t -> assertHttp(t, 409));
    }

    @Test
    void restockingAReturnedPackOrderReturnsEveryComponent() {
        UUID cat = newCategory();
        UUID a = variantId(newProduct(cat, "A", 1000, 400, 10));
        UUID b = variantId(newProduct(cat, "B", 500, 200, 10));
        AdminPackDto pack = packs.create(new PackRequest(new LocalizedName("Duo", "Duo"), null, null,
                1200, true, 0, List.of(new PackItemRequest(a, 1), new PackItemRequest(b, 2))));

        UUID orderId = orderIdByCode(checkout.place(handToHand("0551111111",
                new CartLineRequest(OrderItemType.PACK, pack.id(), 2))).order().code());
        assertThat(stockOf(a)).isEqualTo(8);
        assertThat(stockOf(b)).isEqualTo(6);

        adminOrders.updateDetails(orderId, new UpdateDetailsRequest(null, "Blida", null, null));
        adminOrders.changeStatus(orderId, to(OrderStatus.CONFIRMED), null);
        adminOrders.changeStatus(orderId, to(OrderStatus.DELIVERED), null);
        adminOrders.changeStatus(orderId, to(OrderStatus.RETURNED), null);

        OrderDetailDto detail = adminOrders.get(orderId);
        assertThat(detail.restock()).hasSize(2);
        assertThat(detail.restock()).extracting("ordered").containsExactlyInAnyOrder(2, 4);

        adminOrders.restockReturned(orderId, new RestockRequest(
                List.of(new RestockItem(a, 2), new RestockItem(b, 4)), null), null);
        assertThat(stockOf(a)).isEqualTo(10);
        assertThat(stockOf(b)).isEqualTo(10);
    }
}