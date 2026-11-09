package com.lunelle.backend.stats;

import com.lunelle.backend.catalog.CatalogDtos.LocalizedName;
import com.lunelle.backend.delivery.DeliveryMethod;
import com.lunelle.backend.order.OrderStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class StatsDtos {

    private StatsDtos() {
    }

    /**
     * profit = gross profit on lines that have a cost; uncostedRevenue = sales without a cost price.
     * expenses = the period's share of the monthly costs (cards, boxes, bags...); netProfit = profit - expenses.
     */
    public record PeriodTotals(long revenue, long deliveryFees, long deliveredOrders, long averageOrderValue,
                               long cost, long profit, double marginPercent, long uncostedRevenue,
                               long expenses, long netProfit) {
    }

    public record PipelineEntry(long orders, long amount) {
    }

    public record PipelineDto(PipelineEntry confirmed, PipelineEntry shipped) {
    }

    public record FunnelDto(Map<OrderStatus, Long> byStatus, long created,
                            double confirmationRate, double cancellationRate, double returnRate) {
    }

    public record OverviewDto(LocalDate from, LocalDate to, PeriodTotals current,
                              LocalDate previousFrom, LocalDate previousTo, PeriodTotals previous,
                              PipelineDto pipeline, FunnelDto funnel) {
    }

    public record SeriesPoint(LocalDate date, long revenue, long profit, long deliveredOrders, long createdOrders) {
    }

    public record TimeseriesDto(LocalDate from, LocalDate to, String granularity, List<SeriesPoint> points) {
    }

    public record CategoryStat(LocalizedName name, long units, long revenue, long profit) {
    }

    public record ProductStat(LocalizedName name, long units, long revenue, long profit) {
    }

    public record WilayaStat(String wilaya, long orders, long revenue) {
    }

    public record DeliveryTypeStat(DeliveryMethod method, long orders, long revenue, long deliveryFees) {
    }

    public record BreakdownsDto(LocalDate from, LocalDate to, List<CategoryStat> categories,
                                List<ProductStat> topProducts, List<ProductStat> topPacks,
                                List<WilayaStat> wilayas, List<DeliveryTypeStat> deliveryTypes) {
    }

    public record LowStockDto(UUID variantId, UUID productId, LocalizedName productName,
                              String variantLabel, int stock, boolean outOfStock) {
    }
}