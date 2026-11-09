package com.lunelle.backend.expense;

import com.lunelle.backend.expense.ExpenseDtos.ExpenseRequest;
import com.lunelle.backend.expense.ExpenseDtos.MonthDto;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Owner only: StaffPolicy refuses everything it does not list, and it does not list this. */
@Tag(name = "Expenses (admin)")
@RestController
@RequestMapping("/api/admin/expenses")
@RequiredArgsConstructor
public class AdminExpenseController {

    private final ExpenseService service;

    @GetMapping
    public MonthDto month(@RequestParam String month) {
        return service.month(month);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MonthDto add(@Valid @RequestBody ExpenseRequest request) {
        return service.add(request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
