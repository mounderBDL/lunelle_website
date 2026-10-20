package com.lunelle.backend.stats;

import com.lunelle.backend.stats.StatsDtos.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@Tag(name = "Statistics (admin)")
@RestController
@RequestMapping("/api/admin/stats")
@RequiredArgsConstructor
public class AdminStatsController {

    private final StatsService service;

    /** Revenue, delivered orders, average basket, previous-period comparison, pipeline and funnel. */
    @GetMapping("/overview")
    public OverviewDto overview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.overview(from, to);
    }

    /** Chart data; granularity = day | week | month. Empty periods are filled with zeros. */
    @GetMapping("/timeseries")
    public TimeseriesDto timeseries(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "day") String granularity) {
        return service.timeseries(from, to, granularity);
    }

    /** Sales and profit by category, top products and packs (sort = units | revenue | profit), by wilaya and delivery type. */
    @GetMapping("/breakdowns")
    public BreakdownsDto breakdowns(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "5") int limit,
            @RequestParam(defaultValue = "units") String sort) {
        return service.breakdowns(from, to, limit, sort);
    }

    @GetMapping("/low-stock")
    public List<LowStockDto> lowStock(@RequestParam(defaultValue = "3") int threshold) {
        return service.lowStock(threshold);
    }
}