package com.lunelle.backend.stats;

import com.lunelle.backend.catalog.CatalogDtos.LocalizedName;
import com.lunelle.backend.delivery.DeliveryMethod;
import com.lunelle.backend.order.OrderStatus;
import com.lunelle.backend.stats.StatsDtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.lunelle.backend.expense.ExpenseService;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

/**
 * All figures are computed in SQL. Revenue = orders currently DELIVERED, dated by delivered_at.
 * Money amounts are goods only (subtotal); delivery fees are reported separately.
 * Profit = line total minus saved unit cost, over lines that have a cost.
 */
@Service
@RequiredArgsConstructor
public class StatsService {

    private static final ZoneId ZONE = ZoneId.of("Africa/Algiers");
    private static final int MAX_RANGE_DAYS = 400;
    private static final String LINE_PROFIT =
            "coalesce(sum(case when oi.unit_cost is not null then oi.line_total - oi.unit_cost * oi.quantity end), 0)";

    private final JdbcClient jdbc;
    private final ExpenseService expenses;

    private record Range(LocalDate from, LocalDate to) {
    }

    // ───────────── overview ─────────────

    @Transactional(readOnly = true)
    public OverviewDto overview(LocalDate from, LocalDate to) {
        Range r = range(from, to);
        long days = ChronoUnit.DAYS.between(r.from(), r.to()) + 1;
        LocalDate previousTo = r.from().minusDays(1);
        LocalDate previousFrom = previousTo.minusDays(days - 1);
        return new OverviewDto(r.from(), r.to(), totals(r.from(), r.to()),
                previousFrom, previousTo, totals(previousFrom, previousTo),
                pipeline(), funnel(r.from(), r.to()));
    }

    private PeriodTotals totals(LocalDate from, LocalDate to) {
        OffsetDateTime s = start(from);
        OffsetDateTime e = endExclusive(to);

        long[] orders = jdbc.sql("""
                        select count(*) as orders,
                               coalesce(sum(subtotal), 0) as goods,
                               coalesce(sum(delivery_fee), 0) as fees
                        from orders
                        where status = 'DELIVERED' and delivered_at >= :from and delivered_at < :to
                        """)
                .param("from", s).param("to", e)
                .query((rs, n) -> new long[]{rs.getLong("orders"), rs.getLong("goods"), rs.getLong("fees")})
                .single();

        long[] costs = jdbc.sql("""
                        select coalesce(sum(case when oi.unit_cost is not null then oi.line_total end), 0) as costed_revenue,
                               coalesce(sum(case when oi.unit_cost is not null then oi.unit_cost * oi.quantity end), 0) as cost
                        from order_item oi join orders o on o.id = oi.order_id
                        where o.status = 'DELIVERED' and o.delivered_at >= :from and o.delivered_at < :to
                        """)
                .param("from", s).param("to", e)
                .query((rs, n) -> new long[]{rs.getLong("costed_revenue"), rs.getLong("cost")})
                .single();

        long count = orders[0];
        long goods = orders[1];
        long fees = orders[2];
        long costedRevenue = costs[0];
        long cost = costs[1];
        long profit = costedRevenue - cost;
        long other = expenses.allocated(from, to);
        return new PeriodTotals(goods, fees, count,
                count == 0 ? 0 : Math.round((double) goods / count),
                cost, profit, percent(profit, costedRevenue), goods - costedRevenue,
                other, profit - other);
    }

    private PipelineDto pipeline() {
        Map<String, PipelineEntry> map = new HashMap<>();
        jdbc.sql("""
                        select status, count(*) as c, coalesce(sum(subtotal), 0) as t
                        from orders where status in ('CONFIRMED', 'SHIPPED') group by status
                        """)
                .query((rs, n) -> Map.entry(rs.getString("status"),
                        new PipelineEntry(rs.getLong("c"), rs.getLong("t"))))
                .list()
                .forEach(e -> map.put(e.getKey(), e.getValue()));
        PipelineEntry empty = new PipelineEntry(0, 0);
        return new PipelineDto(map.getOrDefault("CONFIRMED", empty), map.getOrDefault("SHIPPED", empty));
    }

    private FunnelDto funnel(LocalDate from, LocalDate to) {
        Map<OrderStatus, Long> by = new EnumMap<>(OrderStatus.class);
        for (OrderStatus s : OrderStatus.values()) {
            by.put(s, 0L);
        }
        jdbc.sql("""
                        select status, count(*) as c from orders
                        where created_at >= :from and created_at < :to group by status
                        """)
                .param("from", start(from)).param("to", endExclusive(to))
                .query((rs, n) -> Map.entry(OrderStatus.valueOf(rs.getString("status")), rs.getLong("c")))
                .list()
                .forEach(e -> by.put(e.getKey(), e.getValue()));

        long created = by.values().stream().mapToLong(Long::longValue).sum();
        long confirmedOrBeyond = by.get(OrderStatus.CONFIRMED) + by.get(OrderStatus.SHIPPED)
                + by.get(OrderStatus.DELIVERED) + by.get(OrderStatus.RETURNED);
        long shippedOutcomes = by.get(OrderStatus.DELIVERED) + by.get(OrderStatus.RETURNED);
        return new FunnelDto(by, created,
                percent(confirmedOrBeyond, created),
                percent(by.get(OrderStatus.CANCELLED), created),
                percent(by.get(OrderStatus.RETURNED), shippedOutcomes));
    }

    // ───────────── time series ─────────────

    @Transactional(readOnly = true)
    public TimeseriesDto timeseries(LocalDate from, LocalDate to, String granularity) {
        String unit = switch (granularity == null ? "day" : granularity.toLowerCase(Locale.ROOT)) {
            case "day" -> "day";
            case "week" -> "week";
            case "month" -> "month";
            default -> throw bad("granularity must be day, week or month");
        };
        Range r = range(from, to);

        // index 0 = revenue, 1 = delivered orders, 2 = created orders, 3 = profit
        Map<LocalDate, long[]> buckets = new TreeMap<>();
        for (LocalDate d = bucketStart(r.from(), unit); !d.isAfter(r.to()); d = next(d, unit)) {
            buckets.put(d, new long[4]);
        }
        OffsetDateTime s = start(r.from());
        OffsetDateTime e = endExclusive(r.to());

        // `unit` is whitelisted above, so inlining it is safe
        jdbc.sql("select to_char(date_trunc('" + unit + "', delivered_at at time zone 'Africa/Algiers'), 'YYYY-MM-DD') as bucket, "
                        + "count(*) as orders, coalesce(sum(subtotal), 0) as goods "
                        + "from orders where status = 'DELIVERED' and delivered_at >= :from and delivered_at < :to group by 1")
                .param("from", s).param("to", e)
                .query((rs, n) -> new Object[]{LocalDate.parse(rs.getString("bucket")), rs.getLong("goods"), rs.getLong("orders")})
                .list()
                .forEach(row -> {
                    long[] b = buckets.get((LocalDate) row[0]);
                    if (b != null) {
                        b[0] = (long) row[1];
                        b[1] = (long) row[2];
                    }
                });

        jdbc.sql("select to_char(date_trunc('" + unit + "', o.delivered_at at time zone 'Africa/Algiers'), 'YYYY-MM-DD') as bucket, "
                        + LINE_PROFIT + " as profit "
                        + "from order_item oi join orders o on o.id = oi.order_id "
                        + "where o.status = 'DELIVERED' and o.delivered_at >= :from and o.delivered_at < :to group by 1")
                .param("from", s).param("to", e)
                .query((rs, n) -> new Object[]{LocalDate.parse(rs.getString("bucket")), rs.getLong("profit")})
                .list()
                .forEach(row -> {
                    long[] b = buckets.get((LocalDate) row[0]);
                    if (b != null) {
                        b[3] = (long) row[1];
                    }
                });

        jdbc.sql("select to_char(date_trunc('" + unit + "', created_at at time zone 'Africa/Algiers'), 'YYYY-MM-DD') as bucket, "
                        + "count(*) as orders "
                        + "from orders where created_at >= :from and created_at < :to group by 1")
                .param("from", s).param("to", e)
                .query((rs, n) -> new Object[]{LocalDate.parse(rs.getString("bucket")), rs.getLong("orders")})
                .list()
                .forEach(row -> {
                    long[] b = buckets.get((LocalDate) row[0]);
                    if (b != null) {
                        b[2] = (long) row[1];
                    }
                });

        List<SeriesPoint> points = buckets.entrySet().stream()
                .map(en -> new SeriesPoint(en.getKey(), en.getValue()[0], en.getValue()[3],
                        en.getValue()[1], en.getValue()[2]))
                .toList();
        return new TimeseriesDto(r.from(), r.to(), unit, points);
    }

    // ───────────── breakdowns ─────────────

    @Transactional(readOnly = true)
    public BreakdownsDto breakdowns(LocalDate from, LocalDate to, int limit, String sort) {
        Range r = range(from, to);
        int top = Math.min(Math.max(limit, 1), 20);
        OffsetDateTime s = start(r.from());
        OffsetDateTime e = endExclusive(r.to());

        List<CategoryStat> categories = jdbc.sql("""
                        select coalesce(oi.category_name_en, 'Packs') as name_en,
                               coalesce(oi.category_name_fr, 'Packs') as name_fr,
                               sum(oi.quantity) as units, sum(oi.line_total) as revenue,
                        """ + LINE_PROFIT + """
                         as profit
                        from order_item oi join orders o on o.id = oi.order_id
                        where o.status = 'DELIVERED' and o.delivered_at >= :from and o.delivered_at < :to
                        group by 1, 2 order by revenue desc
                        """)
                .param("from", s).param("to", e)
                .query((rs, n) -> new CategoryStat(
                        new LocalizedName(rs.getString("name_en"), rs.getString("name_fr")),
                        rs.getLong("units"), rs.getLong("revenue"), rs.getLong("profit")))
                .list();

        List<DeliveryTypeStat> types = new ArrayList<>(jdbc.sql("""
                        select delivery_method, count(*) as orders,
                               coalesce(sum(subtotal), 0) as goods, coalesce(sum(delivery_fee), 0) as fees
                        from orders
                        where status = 'DELIVERED' and delivered_at >= :from and delivered_at < :to
                        group by delivery_method
                        """)
                .param("from", s).param("to", e)
                .query((rs, n) -> new DeliveryTypeStat(DeliveryMethod.valueOf(rs.getString("delivery_method")),
                        rs.getLong("orders"), rs.getLong("goods"), rs.getLong("fees")))
                .list());
        for (DeliveryMethod m : DeliveryMethod.values()) {
            if (types.stream().noneMatch(t -> t.method() == m)) {
                types.add(new DeliveryTypeStat(m, 0, 0, 0));
            }
        }
        types.sort(Comparator.comparing(DeliveryTypeStat::method));

        List<WilayaStat> wilayas = jdbc.sql("""
                        select wilaya_name, count(*) as orders, coalesce(sum(subtotal), 0) as goods
                        from orders
                        where status = 'DELIVERED' and delivered_at >= :from and delivered_at < :to
                          and wilaya_name is not null
                        group by wilaya_name order by orders desc, goods desc limit 30
                        """)
                .param("from", s).param("to", e)
                .query((rs, n) -> new WilayaStat(rs.getString("wilaya_name"), rs.getLong("orders"), rs.getLong("goods")))
                .list();

        String orderBy = switch (sort == null ? "units" : sort.toLowerCase(Locale.ROOT)) {
            case "units" -> "units desc, revenue desc";
            case "revenue" -> "revenue desc, units desc";
            case "profit" -> "profit desc, units desc";
            default -> throw bad("sort must be units, revenue or profit");
        };
        return new BreakdownsDto(r.from(), r.to(), categories,
                topItems("VARIANT", s, e, top, orderBy), topItems("PACK", s, e, top, orderBy), wilayas, types);
    }

    /** `orderBy` comes from a whitelist in breakdowns(), so inlining it is safe. */
    private List<ProductStat> topItems(String type, OffsetDateTime s, OffsetDateTime e, int limit, String orderBy) {
        return jdbc.sql("select oi.name_en, oi.name_fr, sum(oi.quantity) as units, sum(oi.line_total) as revenue, "
                        + LINE_PROFIT + " as profit "
                        + "from order_item oi join orders o on o.id = oi.order_id "
                        + "where o.status = 'DELIVERED' and o.delivered_at >= :from and o.delivered_at < :to "
                        + "and oi.type = :type "
                        + "group by oi.name_en, oi.name_fr "
                        + "order by " + orderBy + " limit :limit")
                .param("from", s).param("to", e).param("type", type).param("limit", limit)
                .query((rs, n) -> new ProductStat(
                        new LocalizedName(rs.getString("name_en"), rs.getString("name_fr")),
                        rs.getLong("units"), rs.getLong("revenue"), rs.getLong("profit")))
                .list();
    }

    // ───────────── low stock ─────────────

    @Transactional(readOnly = true)
    public List<LowStockDto> lowStock(int threshold) {
        int limit = Math.min(Math.max(threshold, 0), 1000);
        return jdbc.sql("""
                        select v.id as variant_id, p.id as product_id, p.name_en, p.name_fr, v.label, v.stock
                        from product_variant v join product p on p.id = v.product_id
                        where v.is_active and p.is_active and p.archived_at is null and v.stock <= :threshold
                        order by v.stock asc, p.name_en, v.label limit 100
                        """)
                .param("threshold", limit)
                .query((rs, n) -> new LowStockDto(
                        rs.getObject("variant_id", UUID.class), rs.getObject("product_id", UUID.class),
                        new LocalizedName(rs.getString("name_en"), rs.getString("name_fr")),
                        rs.getString("label"), rs.getInt("stock"), rs.getInt("stock") == 0))
                .list();
    }

    // ───────────── helpers ─────────────

    private Range range(LocalDate from, LocalDate to) {
        LocalDate end = to != null ? to : LocalDate.now(ZONE);
        LocalDate begin = from != null ? from : end.minusDays(29);
        if (begin.isAfter(end)) {
            throw bad("The start date must not be after the end date");
        }
        if (ChronoUnit.DAYS.between(begin, end) + 1 > MAX_RANGE_DAYS) {
            throw bad("The period cannot exceed " + MAX_RANGE_DAYS + " days");
        }
        return new Range(begin, end);
    }

    private static OffsetDateTime start(LocalDate day) {
        return day.atStartOfDay(ZONE).toInstant().atOffset(ZoneOffset.UTC);
    }

    private static OffsetDateTime endExclusive(LocalDate day) {
        return day.plusDays(1).atStartOfDay(ZONE).toInstant().atOffset(ZoneOffset.UTC);
    }

    private static LocalDate bucketStart(LocalDate d, String unit) {
        return switch (unit) {
            case "week" -> d.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            case "month" -> d.withDayOfMonth(1);
            default -> d;
        };
    }

    private static LocalDate next(LocalDate d, String unit) {
        return switch (unit) {
            case "week" -> d.plusWeeks(1);
            case "month" -> d.plusMonths(1);
            default -> d.plusDays(1);
        };
    }

    private static double percent(long part, long whole) {
        return whole == 0 ? 0 : Math.round(part * 1000.0 / whole) / 10.0;
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}