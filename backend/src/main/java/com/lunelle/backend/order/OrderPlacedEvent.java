package com.lunelle.backend.order;

import java.util.UUID;

/** Published inside the order transaction; listeners (Telegram, dashboard) use AFTER_COMMIT. */
public record OrderPlacedEvent(UUID orderId, String code) {
}