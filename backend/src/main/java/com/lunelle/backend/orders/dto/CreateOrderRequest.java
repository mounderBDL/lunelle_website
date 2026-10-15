package com.lunelle.backend.orders.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CreateOrderRequest(

        @JsonProperty("customer_name")
        @NotBlank(message = "Customer name is required")
        @Size(max = 200, message = "Customer name must not exceed 200 characters")
        String customerName,

        @JsonProperty("customer_phone")
        @NotBlank(message = "Customer phone is required")
        @Size(max = 30, message = "Customer phone must not exceed 30 characters")
        String customerPhone,

        @NotBlank(message = "Wilaya is required")
        @Size(max = 100, message = "Wilaya must not exceed 100 characters")
        String wilaya,

        @NotBlank(message = "Commune is required")
        @Size(max = 150, message = "Commune must not exceed 150 characters")
        String commune,

        @JsonProperty("delivery_method")
        @NotBlank(message = "Delivery method is required")
        String deliveryMethod,

        @JsonProperty("delivery_type")
        String deliveryType,

        @JsonProperty("delivery_office_id")
        UUID deliveryOfficeId,

        @NotEmpty(message = "An order must contain at least one item")
        @Valid
        List<@NotNull(message = "Order items cannot be null") CreateOrderItemRequest> items

) {

    public record CreateOrderItemRequest(

            @JsonProperty("product_id")
            UUID productId,

            @JsonProperty("pack_id")
            UUID packId,

            @NotNull(message = "Quantity is required")
            @Positive(message = "Quantity must be greater than zero")
            Integer quantity

    ) {
    }
}
