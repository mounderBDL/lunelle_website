package com.lunelle.backend.delivery.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.UUID;

public record DeliveryZoneResponse(
        UUID id,
        String wilaya,

        @JsonProperty("home_delivery_fee")
        BigDecimal homeDeliveryFee,

        @JsonProperty("office_delivery_fee")
        BigDecimal officeDeliveryFee
) {
}
