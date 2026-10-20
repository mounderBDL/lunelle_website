package com.lunelle.backend.notification;

import com.lunelle.backend.order.OrderAdminDtos.OrderDetailDto;
import com.lunelle.backend.order.OrderAdminService;
import com.lunelle.backend.order.OrderPlacedEvent;
import com.lunelle.backend.setting.Setting;
import com.lunelle.backend.setting.SettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Runs only after the order transaction has COMMITTED (an order that fails on stock sends nothing),
 * on a separate thread, so Telegram can never slow down or break checkout.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderNotificationListener {

    private final OrderAdminService orders;
    private final TelegramService telegram;
    private final SettingRepository settings;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderPlaced(OrderPlacedEvent event) {
        try {
            if (!telegram.enabled()) {
                return;
            }
            String chatId = settings.findById("telegram_chat_id")
                    .map(Setting::getValue).orElse("").trim();
            if (chatId.isEmpty()) {
                log.info("Telegram chat id is not set: no notification for {}", event.code());
                return;
            }
            OrderDetailDto order = orders.get(event.orderId());
            if (!telegram.send(chatId, OrderMessage.build(order))) {
                log.warn("Telegram notification for {} was not delivered", event.code());
            }
        } catch (Exception e) {
            log.warn("Notification for {} failed ({})", event.code(), e.getClass().getSimpleName());
        }
    }
}