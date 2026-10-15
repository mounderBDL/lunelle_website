package com.lunelle.backend.packs.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record PackItemsUpdateRequest(
    @NotEmpty
    @Valid
    @JsonProperty("items")
    List<PackItemCreateRequest> items
) {}

