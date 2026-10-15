package com.lunelle.backend.delivery.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record DeliveryZoneCreateRequest(

        @NotBlank(message = "Wilaya is required")
        @Size(max = 100, message = "Wilaya must not exceed 100 characters")
        String wilaya,

        @NotNull(message = "Home delivery fee is required")
        @DecimalMin(value = "0.00", message = "Home delivery fee cannot be negative")
        @Digits(integer = 10, fraction = 2,
                message = "Home delivery fee must have at most 2 decimal places")
        @JsonProperty("home_delivery_fee")
        BigDecimal homeDeliveryFee,

        @NotNull(message = "Office delivery fee is required")
        @DecimalMin(value = "0.00", message = "Office delivery fee cannot be negative")
        @Digits(integer = 10, fraction = 2,
                message = "Office delivery fee must have at most 2 decimal places")
        @JsonProperty("office_delivery_fee")
        BigDecimal officeDeliveryFee
) {
}

