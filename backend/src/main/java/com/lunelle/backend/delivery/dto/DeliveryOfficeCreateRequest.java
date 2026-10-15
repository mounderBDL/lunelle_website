package com.lunelle.backend.delivery.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DeliveryOfficeCreateRequest(

        @NotBlank(message = "Office name is required")
        @Size(max = 200, message = "Office name must not exceed 200 characters")
        String name,

        @NotBlank(message = "Wilaya is required")
        @Size(max = 100, message = "Wilaya must not exceed 100 characters")
        String wilaya,

        @NotBlank(message = "Commune is required")
        @Size(max = 150, message = "Commune must not exceed 150 characters")
        String commune
) {
}
