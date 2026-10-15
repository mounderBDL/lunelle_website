package com.lunelle.backend.categories.dto;

import jakarta.validation.constraints.NotNull;

public record CategoryStatusRequest(
    @NotNull(message = "Category status is required")
    Boolean is_active
) {}
