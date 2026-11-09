package com.lunelle.backend.expense;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public final class ExpenseDtos {

    private ExpenseDtos() {
    }

    public record ExpenseDto(UUID id, String label, long amount) {
    }

    /** One month of costs. month is "YYYY-MM". */
    public record MonthDto(String month, List<ExpenseDto> items, long total) {
    }

    public record ExpenseRequest(
            @NotBlank String month,
            @NotBlank @Size(max = 60) String label,
            @Min(1) @Max(10_000_000) long amount) {
    }
}
