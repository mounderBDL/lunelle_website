package com.lunelle.backend.packs.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record PackResponse(

    UUID id,
    String name,
    String slug,
    String description,
    BigDecimal price,

    @JsonProperty("is_active")
    boolean active,

    List<PackItemResponse> items

) {}
