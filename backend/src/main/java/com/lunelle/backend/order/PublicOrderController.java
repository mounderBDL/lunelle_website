package com.lunelle.backend.order;

import com.lunelle.backend.order.OrderDtos.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import com.lunelle.backend.delivery.DeliveryMethod;
import org.springframework.web.server.ResponseStatusException;

@Tag(name = "Checkout & orders (public)")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PublicOrderController {

    private final CheckoutService checkout;
    private final OrderQueryService queries;

    /** Prices the cart (and the delivery fee once a wilaya is chosen) without creating anything. */
    @PostMapping("/checkout/quote")
    public QuoteDto quote(@Valid @RequestBody QuoteRequest request) {
        return checkout.quote(request);
    }

    @PostMapping("/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public PlacedOrderDto place(@Valid @RequestBody CheckoutRequest request) {
        // hand-to-hand is agreed by phone and set by the admin; customers can't pick it at checkout
        if (request.deliveryMethod() == DeliveryMethod.HAND_TO_HAND) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Please choose home delivery or a Yalidine office");
        }
        return checkout.place(request);
    }

    @GetMapping("/orders/{token}")
    public OrderSummaryDto get(@PathVariable String token) {
        return queries.byToken(token);
    }

    @PostMapping("/orders/lookup")
    public OrderSummaryDto lookup(@Valid @RequestBody LookupRequest request) {
        return queries.lookup(request.code(), request.phone());
    }
}