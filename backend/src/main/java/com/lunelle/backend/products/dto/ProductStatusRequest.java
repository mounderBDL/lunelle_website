package com.lunelle.backend.products.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;

public record ProductStatusRequest(
    @NotNull
    @JsonProperty("is_active")
    Boolean isActive
) {}