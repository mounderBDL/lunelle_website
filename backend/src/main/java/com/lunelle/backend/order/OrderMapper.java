package com.lunelle.backend.order;

import com.lunelle.backend.catalog.CatalogDtos.LocalizedName;
import com.lunelle.backend.common.PhoneUtil;
import com.lunelle.backend.order.OrderDtos.*;

import java.util.Comparator;
import java.util.List;

final class OrderMapper {

    private OrderMapper() {
    }

    static OrderSummaryDto summary(CustomerOrder o) {
        List<OrderLineDto> lines = o.getItems().stream()
                .sorted(Comparator.comparing(OrderItem::getNameEn)
                        .thenComparing(i -> i.getVariantLabel() == null ? "" : i.getVariantLabel()))
                .map(i -> new OrderLineDto(
                        i.getType(),
                        new LocalizedName(i.getNameEn(), i.getNameFr()),
                        i.getVariantLabel(),
                        i.getOriginalUnitPrice(), i.getUnitPrice(), i.getQuantity(), i.getLineTotal(),
                        i.getComponents().stream()
                                .map(c -> new ComponentDto(
                                        new LocalizedName(c.getNameEn(), c.getNameFr()),
                                        c.getVariantLabel(), c.getQuantity()))
                                .toList()))
                .toList();
        return new OrderSummaryDto(
                o.getCode(), o.getStatus(), o.getCreatedAt(), o.getCustomerName(),
                PhoneUtil.mask(o.getPhone()), o.getDeliveryMethod(), o.getWilayaName(),
                o.getCommuneName(), o.getAddress(), o.getHandoverPlace(), o.getHandoverAt(),
                o.getTrackingNumber(), lines, o.getSubtotal(), o.getDeliveryFee(), o.getTotal());
    }
}