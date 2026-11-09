package com.lunelle.backend;

import com.lunelle.backend.expense.ExpenseDtos.ExpenseRequest;
import com.lunelle.backend.expense.ExpenseDtos.MonthDto;
import com.lunelle.backend.expense.ExpenseService;
import com.lunelle.backend.stats.StatsDtos.PeriodTotals;
import com.lunelle.backend.stats.StatsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ExpenseTest extends IntegrationTestBase {

    @Autowired
    private ExpenseService expenses;
    @Autowired
    private StatsService stats;

    @Test
    void addingListsAndTotalsAndDeletingRemoves() {
        expenses.add(new ExpenseRequest("2026-03", "  Visit cards ", 1500));
        MonthDto month = expenses.add(new ExpenseRequest("2026-03", "Delivery boxes", 2500));

        assertThat(month.month()).isEqualTo("2026-03");
        assertThat(month.items()).extracting("label").containsExactly("Visit cards", "Delivery boxes");
        assertThat(month.total()).isEqualTo(4000);

        UUID first = month.items().get(0).id();
        expenses.delete(first);
        assertThat(expenses.month("2026-03").total()).isEqualTo(2500);
        assertThatThrownBy(() -> expenses.delete(first)).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void everyMonthKeepsItsOwnList() {
        expenses.add(new ExpenseRequest("2026-03", "Bags", 1000));

        assertThat(expenses.month("2026-04").items()).isEmpty();
        assertThat(expenses.month("2026-04").total()).isZero();
        assertThat(expenses.month("2026-03").total()).isEqualTo(1000);
    }

    @Test
    void badInputIsRefused() {
        assertThatThrownBy(() -> expenses.month("March")).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> expenses.add(new ExpenseRequest("2026-13", "Bags", 10)))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> expenses.add(new ExpenseRequest("2026-03", "   ", 10)))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void aMonthHoldsAtMostFiftyCosts() {
        for (int i = 0; i < 50; i++) {
            expenses.add(new ExpenseRequest("2026-03", "Cost " + i, 10));
        }
        assertThatThrownBy(() -> expenses.add(new ExpenseRequest("2026-03", "One more", 10)))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void aPeriodCountsInFullEveryMonthItTouches() {
        expenses.add(new ExpenseRequest("2026-03", "March costs", 3100));
        expenses.add(new ExpenseRequest("2026-04", "April costs", 3000));

        assertThat(expenses.allocated(LocalDate.of(2026, 3, 1), LocalDate.of(2026, 3, 10))).isEqualTo(3100);
        assertThat(expenses.allocated(LocalDate.of(2026, 3, 31), LocalDate.of(2026, 4, 1))).isEqualTo(6100);
        assertThat(expenses.allocated(LocalDate.of(2026, 4, 30), LocalDate.of(2026, 4, 30))).isEqualTo(3000);
        assertThat(expenses.allocated(LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 31))).isZero();
    }

    @Test
    void netProfitIsProfitMinusTheCostsOfThePeriod() {
        LocalDate firstOfLastMonth = LocalDate.now().minusMonths(1).withDayOfMonth(1);
        LocalDate lastOfLastMonth = firstOfLastMonth.plusMonths(1).minusDays(1);
        expenses.add(new ExpenseRequest(firstOfLastMonth.toString().substring(0, 7), "Boxes", 6000));

        PeriodTotals totals = stats.overview(firstOfLastMonth, lastOfLastMonth).current();

        assertThat(totals.expenses()).isEqualTo(6000);
        assertThat(totals.netProfit()).isEqualTo(totals.profit() - 6000);
    }
}
