package com.lunelle.backend.order;

import com.lunelle.backend.catalog.CatalogDtos.LocalizedName;
import com.lunelle.backend.order.OrderAdminDtos.*;
import com.lunelle.backend.order.OrderDtos.ComponentDto;

import java.util.Comparator;
import java.util.List;

final class OrderAdminMapper {

    private OrderAdminMapper() {
    }

    static boolean needsDetails(CustomerOrder o) {
        return o.getStatus() == OrderStatus.NEW && o.getItems().stream()
                .anyMatch(i -> i.isRequiresFollowUp()
                        && (i.getCustomizationNotes() == null || i.getCustomizationNotes().isBlank()));
    }

    static OrderListItemDto listItem(CustomerOrder o) {
        return new OrderListItemDto(
                o.getId(), o.getCode(), o.getStatus(), o.getCreatedAt(), o.getCustomerName(), o.getPhone(),
                o.getDeliveryMethod(), o.getWilayaName(), o.getCommuneName(),
                o.getItems().stream().mapToInt(OrderItem::getQuantity).sum(),
                o.getTotal(), needsDetails(o));
    }

    static OrderDetailDto detail(CustomerOrder o, List<OrderStatusHistory> history) {
        List<AdminOrderItemDto> items = o.getItems().stream()
                .sorted(Comparator.comparing(OrderItem::getNameEn)
                        .thenComparing(i -> i.getVariantLabel() == null ? "" : i.getVariantLabel()))
                .map(i -> new AdminOrderItemDto(
                        i.getId(), i.getType(), new LocalizedName(i.getNameEn(), i.getNameFr()),
                        i.getVariantLabel(), i.getOriginalUnitPrice(), i.getUnitPrice(), i.getUnitCost(),
                        i.getQuantity(), i.getLineTotal(), i.isRequiresFollowUp(), i.getCustomizationNotes(),
                        i.getComponents().stream()
                                .map(c -> new ComponentDto(
                                        new LocalizedName(c.getNameEn(), c.getNameFr()),
                                        c.getVariantLabel(), c.getQuantity()))
                                .toList()))
                .toList();
        List<HistoryDto> hist = history.stream()
                .map(h -> new HistoryDto(h.getFromStatus(), h.getToStatus(), h.getNote(),
                        h.getAdminId(), h.getCreatedAt()))
                .toList();

        // order cost and profit are only known when every line has a cost
        boolean allCosted = o.getItems().stream().allMatch(i -> i.getUnitCost() != null);
        Integer cost = allCosted
                ? o.getItems().stream().mapToInt(i -> i.getUnitCost() * i.getQuantity()).sum()
                : null;
        Integer profit = cost == null ? null : o.getSubtotal() - cost;

        return new OrderDetailDto(
                o.getId(), o.getCode(), o.getStatus(),
                o.getCreatedAt(), o.getConfirmedAt(), o.getShippedAt(), o.getDeliveredAt(), o.getCancelledAt(),
                o.getCustomerName(), o.getPhone(), o.getCustomerNote(), o.getLocale(),
                o.getDeliveryMethod(), o.getWilayaId(), o.getWilayaName(),
                o.getCommuneId(), o.getCommuneName(), o.getAddress(),
                o.getDeliveryFee(), o.getHandoverPlace(), o.getHandoverAt(), o.getTrackingNumber(),
                o.getSubtotal(), o.getTotal(), cost, profit, o.getAdminNote(),
                o.getStatus() == OrderStatus.NEW, needsDetails(o), OrderWorkflow.allowed(o),
                items, hist);
    }
}