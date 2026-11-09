package com.lunelle.backend.expense;

import com.lunelle.backend.expense.ExpenseDtos.ExpenseDto;
import com.lunelle.backend.expense.ExpenseDtos.ExpenseRequest;
import com.lunelle.backend.expense.ExpenseDtos.MonthDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

/**
 * The monthly costs besides the products themselves. Each month keeps its own list, so a new month simply starts
 * empty and the past stays available. For the statistics, any period counts in full the costs of every month
 * it touches.
 */
@Service
@RequiredArgsConstructor
public class ExpenseService {

    static final int MAX_PER_MONTH = 50;

    private final JdbcClient jdbc;

    @Transactional(readOnly = true)
    public MonthDto month(String month) {
        YearMonth ym = parse(month);
        List<ExpenseDto> items = jdbc.sql("""
                        select id, label, amount from monthly_expense
                        where month = :month order by created_at, id
                        """)
                .param("month", ym.atDay(1))
                .query((rs, n) -> new ExpenseDto(rs.getObject("id", UUID.class), rs.getString("label"),
                        rs.getLong("amount")))
                .list();
        return new MonthDto(ym.toString(), items, items.stream().mapToLong(ExpenseDto::amount).sum());
    }

    @Transactional
    public MonthDto add(ExpenseRequest request) {
        YearMonth ym = parse(request.month());
        String label = request.label().trim();
        if (label.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Write what the cost is for");
        }
        long existing = jdbc.sql("select count(*) from monthly_expense where month = :month")
                .param("month", ym.atDay(1)).query(Long.class).single();
        if (existing >= MAX_PER_MONTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A month can hold up to " + MAX_PER_MONTH + " costs");
        }
        jdbc.sql("insert into monthly_expense (month, label, amount) values (:month, :label, :amount)")
                .param("month", ym.atDay(1)).param("label", label).param("amount", request.amount())
                .update();
        return month(ym.toString());
    }

    @Transactional
    public void delete(UUID id) {
        int removed = jdbc.sql("delete from monthly_expense where id = :id").param("id", id).update();
        if (removed == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cost not found");
        }
    }

    /** The costs of every month that from..to touches, counted in full (both days included). */
    @Transactional(readOnly = true)
    public long allocated(LocalDate from, LocalDate to) {
        return jdbc.sql("""
                        select coalesce(sum(amount), 0) from monthly_expense
                        where month >= :first and month <= :last
                        """)
                .param("first", from.withDayOfMonth(1)).param("last", to.withDayOfMonth(1))
                .query(Long.class).single();
    }

    private static YearMonth parse(String month) {
        try {
            return YearMonth.parse(month);
        } catch (DateTimeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Month must look like 2026-11");
        }
    }
}
