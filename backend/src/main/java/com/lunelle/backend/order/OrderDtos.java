package com.lunelle.backend.order;

import com.lunelle.backend.catalog.CatalogDtos.LocalizedName;
import com.lunelle.backend.delivery.DeliveryMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class OrderDtos {

    private OrderDtos() {
    }

    // ───── requests ─────
    public record CartLineRequest(
            @NotNull OrderItemType type,
            @NotNull UUID id,
            @NotNull @Min(1) @Max(10) Integer quantity) {
    }

    public record QuoteRequest(
            @NotEmpty @Size(max = 20) List<@Valid CartLineRequest> items,
            @NotNull DeliveryMethod deliveryMethod,
            Integer wilayaId) {
    }

    public record CheckoutRequest(
            @NotBlank @Size(min = 2, max = 100) String customerName,
            @NotBlank @Size(max = 30) String phone,
            @Pattern(regexp = "fr|en") String locale,
            @NotNull DeliveryMethod deliveryMethod,
            Integer wilayaId,
            Integer communeId,
            @Size(max = 300) String address,
            @Size(max = 500) String note,
            @NotEmpty @Size(max = 20) List<@Valid CartLineRequest> items,
            @Size(max = 100) String website, // honeypot: hidden field, humans never fill it
            @Pattern(regexp = "[A-Za-z0-9-]{16,64}") String idempotencyKey) { // one random key per order attempt

        /** The same request without a key: keeps the existing callers and tests as they are. */
        public CheckoutRequest(String customerName, String phone, String locale, DeliveryMethod deliveryMethod,
                               Integer wilayaId, Integer communeId, String address, String note,
                               List<CartLineRequest> items, String website) {
            this(customerName, phone, locale, deliveryMethod, wilayaId, communeId, address, note, items, website,
                    null);
        }
    }

    public record LookupRequest(
            @NotBlank @Size(max = 30) String code,
            @NotBlank @Size(max = 30) String phone) {
    }

    // ───── quote ─────
    public record QuoteLineDto(
            OrderItemType type, UUID id, LocalizedName name, String variantLabel, String imageUrl,
            int originalUnitPrice, int unitPrice, int quantity, int lineTotal,
            int available, LineProblem problem) {
    }

    /** deliveryFee and total are null until the customer has chosen a wilaya (for HOME / STOP_DESK). */
    public record QuoteDto(
            List<QuoteLineDto> lines, int subtotal, Integer deliveryFee, Integer total, boolean ok) {
    }

    // ───── order views ─────
    public record ComponentDto(LocalizedName name, String variantLabel, int quantity) {
    }

    public record OrderLineDto(
            OrderItemType type, LocalizedName name, String variantLabel,
            int originalUnitPrice, int unitPrice, int quantity, int lineTotal,
            List<ComponentDto> components) {
    }

    public record OrderSummaryDto(
            String code, OrderStatus status, Instant createdAt, String customerName, String phoneMasked,
            DeliveryMethod deliveryMethod, String wilayaName, String communeName, String address,
            String handoverPlace, Instant handoverAt, String trackingNumber,
            List<OrderLineDto> items, int subtotal, int deliveryFee, int total) {
    }

    public record PlacedOrderDto(String publicToken, OrderSummaryDto order) {
    }
}