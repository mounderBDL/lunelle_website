package com.lunelle.backend.orders.controller;

import com.lunelle.backend.common.response.ApiResponse;
import com.lunelle.backend.orders.dto.CreateOrderRequest;
import com.lunelle.backend.orders.dto.OrderCheckoutResponse;
import com.lunelle.backend.orders.service.OrderCheckoutService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderCheckoutService checkoutService;

    public OrderController(OrderCheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OrderCheckoutResponse>> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey
    ) {
        OrderCheckoutResponse response =
                checkoutService.createOrder(request, idempotencyKey);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new ApiResponse<>(response));
    }
}
