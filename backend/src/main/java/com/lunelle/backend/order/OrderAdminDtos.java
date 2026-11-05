package com.lunelle.backend.order;

import com.lunelle.backend.catalog.CatalogDtos.LocalizedName;
import com.lunelle.backend.delivery.DeliveryMethod;
import com.lunelle.backend.order.OrderDtos.CartLineRequest;
import com.lunelle.backend.order.OrderDtos.ComponentDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class OrderAdminDtos {

    private OrderAdminDtos() {
    }

    public record PageDto<T>(List<T> items, int page, int size, long totalElements, int totalPages) {
    }

    public record OrderListItemDto(
            UUID id, String code, OrderStatus status, Instant createdAt, String customerName, String phone,
            DeliveryMethod deliveryMethod, String wilayaName, String communeName,
            int itemCount, int total) {
    }

    public record AdminOrderItemDto(
            UUID id, OrderItemType type, UUID refId, LocalizedName name, String variantLabel,
            int originalUnitPrice, int unitPrice, Integer unitCost, int quantity, int lineTotal,
            List<ComponentDto> components) {
    }

    public record HistoryDto(
            OrderStatus fromStatus, OrderStatus toStatus, String note, UUID adminId, Instant createdAt) {
    }

       /** One size that came back with a returned order (packs are split into their components). */
       public record RestockLineDto(
               UUID variantId, LocalizedName name, String variantLabel, int ordered, int restocked, int remaining) {
       }

       public record RestockItem(
               @NotNull UUID variantId,
               @NotNull @Min(1) @Max(1000) Integer quantity) {
       }

       public record RestockRequest(
               @NotEmpty @Size(max = 50) List<@Valid RestockItem> items,
               @Size(max = 500) String note) {
       }    

       public record OrderDetailDto(
               UUID id, String code, OrderStatus status,
               Instant createdAt, Instant confirmedAt, Instant shippedAt, Instant deliveredAt, Instant cancelledAt,
               String customerName, String phone, String customerNote, String locale,
               DeliveryMethod deliveryMethod, Integer wilayaId, String wilayaName,
               Integer communeId, String communeName, String address,
               int deliveryFee, String handoverPlace, Instant handoverAt, String trackingNumber,
               int subtotal, int total, Integer cost, Integer profit, String adminNote,
               boolean editable, List<OrderStatus> allowedStatuses,
               List<AdminOrderItemDto> items, List<HistoryDto> history, List<RestockLineDto> restock) {

           /** Staff never see what the shop paid for the goods, nor the profit. */
           public OrderDetailDto withoutCosts() {
               List<AdminOrderItemDto> safeItems = items.stream()
                       .map(i -> new AdminOrderItemDto(i.id(), i.type(), i.refId(), i.name(), i.variantLabel(),
                               i.originalUnitPrice(), i.unitPrice(), null, i.quantity(), i.lineTotal(), i.components()))
                       .toList();
               return new OrderDetailDto(id, code, status, createdAt, confirmedAt, shippedAt, deliveredAt, cancelledAt,
                       customerName, phone, customerNote, locale, deliveryMethod, wilayaId, wilayaName,
                       communeId, communeName, address, deliveryFee, handoverPlace, handoverAt, trackingNumber,
                       subtotal, total, null, null, adminNote, editable, allowedStatuses,
                       safeItems, history, restock);
           }
       }

    // ───── requests ─────
    public record ChangeStatusRequest(
            @NotNull OrderStatus status,
            @Size(max = 500) String note,
            @Size(max = 60) String trackingNumber) {
    }

    public record EditOrderRequest(
            @NotBlank @Size(min = 2, max = 100) String customerName,
            @NotBlank @Size(max = 30) String phone,
            @NotNull DeliveryMethod deliveryMethod,
            Integer wilayaId,
            Integer communeId,
            @Size(max = 300) String address,
            @Size(max = 500) String customerNote,
            @NotEmpty @Size(max = 20) List<@Valid CartLineRequest> items) {
    }

    /** Full replace of these four fields: send the current value for the ones you don't change. */
    public record UpdateDetailsRequest(
            @Size(max = 1000) String adminNote,
            @Size(max = 300) String handoverPlace,
            Instant handoverAt,
            @Size(max = 60) String trackingNumber) {
    }
}