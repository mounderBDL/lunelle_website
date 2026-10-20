package com.lunelle.backend.notification;

import com.lunelle.backend.setting.Setting;
import com.lunelle.backend.setting.SettingRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Notifications (admin)")
@RestController
@RequestMapping("/api/admin/notifications/telegram")
@RequiredArgsConstructor
public class AdminNotificationController {

    public record TestResult(boolean tokenConfigured, boolean chatIdConfigured, boolean sent, String message) {
    }

    private final TelegramService telegram;
    private final SettingRepository settings;

    /** Chats that recently wrote to the bot: find yours, then save its id in the settings. */
    @GetMapping("/chats")
    public List<TelegramService.ChatInfo> chats() {
        return telegram.detectChats();
    }

    @PostMapping("/test")
    public TestResult test() {
        if (!telegram.enabled()) {
            return new TestResult(false, false, false, "TELEGRAM_BOT_TOKEN is not set on the server");
        }
        String chatId = settings.findById("telegram_chat_id").map(Setting::getValue).orElse("").trim();
        if (chatId.isEmpty()) {
            return new TestResult(true, false, false, "No chat id saved yet (setting telegram_chat_id)");
        }
        boolean sent = telegram.send(chatId, "✅ <b>Lunelle</b>: order notifications are working.");
        return new TestResult(true, true, sent, sent
                ? "Message sent"
                : "Telegram refused it or could not be reached: check the chat id, and that Start was pressed on the bot");
    }
}