package com.lunelle.backend.delivery.dto;

import java.util.UUID;

public record DeliveryOfficeResponse(
        UUID id,
        String name,
        String wilaya,
        String commune
) {
}
