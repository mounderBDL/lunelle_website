package com.lunelle.backend.notification;

import com.lunelle.backend.order.OrderAdminDtos.AdminOrderItemDto;
import com.lunelle.backend.order.OrderAdminDtos.OrderDetailDto;
import com.lunelle.backend.order.OrderItemType;

import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

final class OrderMessage {

    private OrderMessage() {
    }

    static String build(OrderDetailDto o) {
        StringBuilder sb = new StringBuilder();
        sb.append("🛍 <b>New order ").append(esc(o.code())).append("</b>\n");
        sb.append("👤 ").append(esc(o.customerName())).append(" · ").append(esc(o.phone())).append('\n');
        sb.append("📍 ").append(destination(o)).append("\n\n");

        for (AdminOrderItemDto i : o.items()) {
            sb.append("• ").append(i.quantity()).append(" × ").append(esc(i.name().en()));
            if (i.variantLabel() != null) {
                sb.append(" (").append(esc(i.variantLabel())).append(')');
            }
            if (i.type() == OrderItemType.PACK) {
                sb.append(" [pack]");
            }
            sb.append('\n');
        }

        sb.append("\n💰 <b>").append(money(o.total())).append("</b>");
        sb.append(o.deliveryFee() == 0 ? " (free delivery)" : " (delivery " + money(o.deliveryFee()) + ")");
        if (o.customerNote() != null && !o.customerNote().isBlank()) {
            sb.append("\n📝 ").append(esc(o.customerNote()));
        }
        return sb.toString();
    }

    private static String destination(OrderDetailDto o) {
        return switch (o.deliveryMethod()) {
            case HOME -> "Home delivery: " + esc(join(o.wilayaName(), o.communeName(), o.address()));
            case STOP_DESK -> "Stop-desk: " + esc(join(o.wilayaName(), o.communeName()));
            case HAND_TO_HAND -> "Hand-to-hand (meeting place to be set)";
        };
    }

    private static String join(String... parts) {
        return Stream.of(parts)
                .filter(Objects::nonNull)
                .filter(s -> !s.isBlank())
                .collect(Collectors.joining(", "));
    }

    private static String money(int amount) {
        return String.format(Locale.US, "%,d DZD", amount);
    }

    /** Telegram's HTML mode: only these three characters need escaping. */
    private static String esc(String s) {
        return s == null ? "" : s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}