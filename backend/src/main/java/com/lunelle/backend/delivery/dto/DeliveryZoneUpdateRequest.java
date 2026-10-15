package com.lunelle.backend.delivery.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;

import java.math.BigDecimal;

public record DeliveryZoneUpdateRequest(

        @DecimalMin(value = "0.00",
                message = "Home delivery fee cannot be negative")
        @Digits(integer = 10, fraction = 2,
                message = "Home delivery fee must have at most 2 decimal places")
        @JsonProperty("home_delivery_fee")
        BigDecimal homeDeliveryFee,

        @DecimalMin(value = "0.00",
                message = "Office delivery fee cannot be negative")
        @Digits(integer = 10, fraction = 2,
                message = "Office delivery fee must have at most 2 decimal places")
        @JsonProperty("office_delivery_fee")
        BigDecimal officeDeliveryFee
) {
}
