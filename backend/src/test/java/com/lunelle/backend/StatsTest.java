package com.lunelle.backend;

import com.lunelle.backend.catalog.CatalogDtos.CategoryRequest;
import com.lunelle.backend.catalog.CatalogDtos.LocalizedName;
import com.lunelle.backend.catalog.PackDtos.AdminPackDto;
import com.lunelle.backend.catalog.PackDtos.PackItemRequest;
import com.lunelle.backend.catalog.PackDtos.PackRequest;
import com.lunelle.backend.delivery.DeliveryMethod;
import com.lunelle.backend.order.OrderAdminDtos.ChangeStatusRequest;
import com.lunelle.backend.order.OrderAdminDtos.UpdateDetailsRequest;
import com.lunelle.backend.order.OrderDtos.CartLineRequest;
import com.lunelle.backend.order.OrderDtos.CheckoutRequest;
import com.lunelle.backend.order.OrderDtos.PlacedOrderDto;
import com.lunelle.backend.order.OrderItemType;
import com.lunelle.backend.order.OrderStatus;
import com.lunelle.backend.stats.StatsDtos.BreakdownsDto;
import com.lunelle.backend.stats.StatsDtos.CategoryStat;
import com.lunelle.backend.stats.StatsDtos.DeliveryTypeStat;
import com.lunelle.backend.stats.StatsDtos.FunnelDto;
import com.lunelle.backend.stats.StatsDtos.PeriodTotals;
import com.lunelle.backend.stats.StatsDtos.SeriesPoint;
import com.lunelle.backend.stats.StatsDtos.TimeseriesDto;
import com.lunelle.backend.stats.StatsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static java.util.stream.Collectors.toMap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StatsTest extends IntegrationTestBase {

    private static final ZoneId ZONE = ZoneId.of("Africa/Algiers");

    @Autowired
    private StatsService stats;

    private static ChangeStatusRequest to(OrderStatus status) {
        return new ChangeStatusRequest(status, null, null);
    }

    private static void assert400(Throwable t) {
        assertThat(t).isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode().value()).isEqualTo(400));
    }

    private UUID place(CartLineRequest line, String phone) {
        return orderIdByCode(checkout.place(handToHand(phone, line)).order().code());
    }

    /** A hand-to-hand order taken all the way to DELIVERED. */
    private UUID deliver(CartLineRequest line, String phone) {
        UUID id = place(line, phone);
        adminOrders.updateDetails(id, new UpdateDetailsRequest(null, "Blida", null, null));
        adminOrders.changeStatus(id, to(OrderStatus.CONFIRMED), null);
        adminOrders.changeStatus(id, to(OrderStatus.DELIVERED), null);
        return id;
    }

    @Test
    void pipelineValueIsGoodsOnlyWithoutDeliveryFees() {
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 10));
        PlacedOrderDto placed = checkout.place(new CheckoutRequest("Test Client", "0551111111", "fr",
                DeliveryMethod.HOME, 16, communeOf(16, 0), "12 rue des Tests", null,
                List.of(variantLine(v, 2)), null));
        assertThat(placed.order().deliveryFee()).isPositive();

        adminOrders.changeStatus(orderIdByCode(placed.order().code()), to(OrderStatus.CONFIRMED), null);

        var confirmed = stats.overview(null, null).pipeline().confirmed();
        assertThat(confirmed.orders()).isEqualTo(1);
        assertThat(confirmed.amount()).isEqualTo(2000); // 2 x 1,000: no delivery fee
    }

    @Test
    void overviewCountsDeliveredGoodsOnlyAndReturnedOrdersDropOut() {
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 50));

        deliver(variantLine(v, 2), "0551000001"); // 2,000 goods, cost 800
        UUID returned = deliver(variantLine(v, 1), "0551000002"); // 1,000 goods
        assertThat(stats.overview(null, null).current().revenue()).isEqualTo(3000);

        adminOrders.changeStatus(returned, to(OrderStatus.RETURNED), null);

        PeriodTotals totals = stats.overview(null, null).current();
        assertThat(totals.revenue()).isEqualTo(2000);
        assertThat(totals.cost()).isEqualTo(800);
        assertThat(totals.profit()).isEqualTo(1200);
        assertThat(totals.marginPercent()).isEqualTo(60.0);
        assertThat(totals.deliveredOrders()).isEqualTo(1);
        assertThat(totals.averageOrderValue()).isEqualTo(2000);
        assertThat(totals.deliveryFees()).isZero();
        assertThat(totals.uncostedRevenue()).isZero();
    }

    @Test
    void salesWithoutACostPriceAreReportedAndLeftOutOfTheProfit() {
        UUID costed = variantId(newProduct(newCategory(), "Rose", 1000, 400, 50));
        UUID uncosted = variantId(newProduct(newCategory(), "Oud", 500, 100, 50));
        jdbc.sql("update product_variant set cost_price = null where id = :id").param("id", uncosted).update();

        deliver(variantLine(costed, 1), "0551000001");
        deliver(variantLine(uncosted, 2), "0551000002");

        PeriodTotals totals = stats.overview(null, null).current();
        assertThat(totals.revenue()).isEqualTo(2000); // 1,000 + 2 x 500
        assertThat(totals.uncostedRevenue()).isEqualTo(1000);
        assertThat(totals.cost()).isEqualTo(400);
        assertThat(totals.profit()).isEqualTo(600); // only the costed sale: 1,000 - 400
    }

    @Test
    void funnelCountsOrdersReceivedByTheirCurrentStatus() {
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 50));

        deliver(variantLine(v, 1), "0551000001");
        UUID returned = deliver(variantLine(v, 1), "0551000002");
        adminOrders.changeStatus(returned, to(OrderStatus.RETURNED), null);
        UUID cancelled = place(variantLine(v, 1), "0551000003");
        adminOrders.changeStatus(cancelled, to(OrderStatus.CANCELLED), null);
        place(variantLine(v, 1), "0551000004"); // stays NEW

        FunnelDto funnel = stats.overview(null, null).funnel();
        assertThat(funnel.created()).isEqualTo(4);
        assertThat(funnel.byStatus().get(OrderStatus.DELIVERED)).isEqualTo(1L);
        assertThat(funnel.byStatus().get(OrderStatus.RETURNED)).isEqualTo(1L);
        assertThat(funnel.byStatus().get(OrderStatus.CANCELLED)).isEqualTo(1L);
        assertThat(funnel.byStatus().get(OrderStatus.NEW)).isEqualTo(1L);
        assertThat(funnel.confirmationRate()).isEqualTo(50.0); // delivered + returned out of 4
        assertThat(funnel.cancellationRate()).isEqualTo(25.0);
        assertThat(funnel.returnRate()).isEqualTo(50.0); // 1 returned out of 2 parcels that were sent
    }

    @Test
    void timeseriesFillsEmptyDaysAndAddsUpToTheOverview() {
        UUID v = variantId(newProduct(newCategory(), "Rose", 1000, 400, 50));
        deliver(variantLine(v, 2), "0551000001");
        place(variantLine(v, 1), "0551000002"); // received, not delivered

        LocalDate today = LocalDate.now(ZONE);
        TimeseriesDto days = stats.timeseries(today.minusDays(6), today, "day");

        assertThat(days.points()).hasSize(7);
        SeriesPoint last = days.points().get(6);
        assertThat(last.date()).isEqualTo(today);
        assertThat(last.revenue()).isEqualTo(2000);
        assertThat(last.profit()).isEqualTo(1200);
        assertThat(last.deliveredOrders()).isEqualTo(1);
        assertThat(last.createdOrders()).isEqualTo(2);
        assertThat(days.points().subList(0, 6)).allSatisfy(p -> {
            assertThat(p.revenue()).isZero();
            assertThat(p.createdOrders()).isZero();
        });
        assertThat(days.points().stream().mapToLong(SeriesPoint::revenue).sum())
                .isEqualTo(stats.overview(today.minusDays(6), today).current().revenue());

        TimeseriesDto weeks = stats.timeseries(today.minusDays(20), today, "week");
        assertThat(weeks.points().get(0).date().getDayOfWeek()).isEqualTo(DayOfWeek.MONDAY);
        assertThat(weeks.points().stream().mapToLong(SeriesPoint::revenue).sum()).isEqualTo(2000);

        TimeseriesDto months = stats.timeseries(today.minusDays(60), today, "month");
        assertThat(months.points().get(0).date().getDayOfMonth()).isEqualTo(1);
        assertThat(months.points().stream().mapToLong(SeriesPoint::revenue).sum()).isEqualTo(2000);
    }

    @Test
    void breakdownsAddUpToTheRevenueAndPacksHaveTheirOwnLine() {
        UUID brumes = categories.create(new CategoryRequest(new LocalizedName("Brumes", "Brumes"), null, null, 0, true)).id();
        UUID muscs = categories.create(new CategoryRequest(new LocalizedName("Muscs", "Muscs"), null, null, 1, true)).id();
        UUID a = variantId(newProduct(brumes, "A", 1000, 400, 50));
        UUID b = variantId(newProduct(muscs, "B", 500, 200, 50));
        AdminPackDto pack = packs.create(new PackRequest(new LocalizedName("Duo", "Duo"), null, null, 1200, true, 0,
                List.of(new PackItemRequest(a, 1), new PackItemRequest(b, 1))));

        deliver(variantLine(a, 2), "0551000001"); // 2,000
        deliver(variantLine(b, 1), "0551000002"); //   500
        deliver(new CartLineRequest(OrderItemType.PACK, pack.id(), 1), "0551000003"); // 1,200

        BreakdownsDto data = stats.breakdowns(null, null, 5, "units");

        Map<String, CategoryStat> byName = data.categories().stream()
                .collect(toMap(c -> c.name().en(), c -> c));
        assertThat(byName).containsOnlyKeys("Brumes", "Muscs", "Packs");
        assertThat(byName.get("Brumes").revenue()).isEqualTo(2000);
        assertThat(byName.get("Brumes").units()).isEqualTo(2);
        assertThat(byName.get("Brumes").profit()).isEqualTo(1200);
        assertThat(byName.get("Muscs").revenue()).isEqualTo(500);
        assertThat(byName.get("Muscs").profit()).isEqualTo(300);
        assertThat(byName.get("Packs").revenue()).isEqualTo(1200);
        assertThat(byName.get("Packs").profit()).isEqualTo(600); // 1,200 - (400 + 200)

        PeriodTotals totals = stats.overview(null, null).current();
        assertThat(data.categories().stream().mapToLong(CategoryStat::revenue).sum())
                .isEqualTo(totals.revenue()).isEqualTo(3700);
        assertThat(data.categories().stream().mapToLong(CategoryStat::profit).sum())
                .isEqualTo(totals.profit()).isEqualTo(2100);

        assertThat(data.topProducts()).extracting(p -> p.name().en()).containsExactly("A", "B");
        assertThat(data.topProducts().get(0).units()).isEqualTo(2);
        assertThat(data.topPacks()).hasSize(1);
        assertThat(data.topPacks().get(0).name().en()).isEqualTo("Duo");
        assertThat(stats.breakdowns(null, null, 5, "profit").topProducts().get(0).name().en()).isEqualTo("A");

        Map<DeliveryMethod, DeliveryTypeStat> types = data.deliveryTypes().stream()
                .collect(toMap(DeliveryTypeStat::method, t -> t));
        assertThat(types).containsOnlyKeys(DeliveryMethod.values());
        assertThat(types.get(DeliveryMethod.HAND_TO_HAND).orders()).isEqualTo(3);
        assertThat(types.get(DeliveryMethod.HAND_TO_HAND).revenue()).isEqualTo(3700);
        assertThat(types.get(DeliveryMethod.HOME).orders()).isZero();
        assertThat(data.wilayas()).isEmpty(); // hand-to-hand orders have no wilaya
    }

    @Test
    void invalidPeriodsAndOptionsAreRefused() {
        LocalDate today = LocalDate.now(ZONE);

        assertThatThrownBy(() -> stats.overview(today, today.minusDays(1))).satisfies(StatsTest::assert400);
        assertThatThrownBy(() -> stats.overview(today.minusDays(400), today)).satisfies(StatsTest::assert400); // 401 days
        assertThatCode(() -> stats.overview(today.minusDays(399), today)).doesNotThrowAnyException(); // 400 days
        assertThatThrownBy(() -> stats.timeseries(null, null, "hour")).satisfies(StatsTest::assert400);
        assertThatThrownBy(() -> stats.breakdowns(null, null, 5, "colour")).satisfies(StatsTest::assert400);
    }
}