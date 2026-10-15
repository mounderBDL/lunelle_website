package com.lunelle.backend.delivery.dto;

import jakarta.validation.constraints.Size;

public record DeliveryOfficeUpdateRequest(
    @Size(max = 200)
    String name,

    @Size(max = 100)
    String wilaya,

    @Size(max = 150)
    String commune
) {}
