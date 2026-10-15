
package com.lunelle.backend.packs.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;

public record PackStatusRequest(
    @NotNull
    @JsonProperty("is_active")
    Boolean active
) {}

