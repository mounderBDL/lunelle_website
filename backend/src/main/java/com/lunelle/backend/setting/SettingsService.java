package com.lunelle.backend.setting;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SettingsService {

    private static final List<String> PUBLIC_KEYS = List.of("store_name", "contact_phone", "instagram_url");
    private static final List<String> ADMIN_KEYS =
            List.of("store_name", "contact_phone", "instagram_url", "telegram_chat_id");

    private final SettingRepository settings;

    @Transactional(readOnly = true)
    public Map<String, String> publicSettings() {
        return read(PUBLIC_KEYS);
    }

    @Transactional(readOnly = true)
    public Map<String, String> adminSettings() {
        return read(ADMIN_KEYS);
    }

    /** Only the keys sent are changed; unknown keys are rejected. */
    @Transactional
    public Map<String, String> update(Map<String, String> changes) {
        for (Map.Entry<String, String> e : changes.entrySet()) {
            if (!ADMIN_KEYS.contains(e.getKey())) {
                throw bad("Unknown setting: " + e.getKey());
            }
            String value = e.getValue() == null ? "" : e.getValue().trim();
            validate(e.getKey(), value);
            settings.save(new Setting(e.getKey(), value));
        }
        return adminSettings();
    }

    private void validate(String key, String value) {
        switch (key) {
            case "store_name" -> {
                if (value.isEmpty() || value.length() > 80) {
                    throw bad("The store name is required (80 characters maximum)");
                }
            }
            case "contact_phone" -> {
                if (value.length() > 30) {
                    throw bad("The contact phone is too long");
                }
            }
            case "instagram_url" -> {
                if (!value.isEmpty() && (value.length() > 300 || !value.matches("^https?://\\S+$"))) {
                    throw bad("The Instagram link must start with http:// or https://");
                }
            }
            case "telegram_chat_id" -> {
                if (!value.isEmpty() && !value.matches("^-?\\d{5,20}$")) {
                    throw bad("The Telegram chat id is a number (groups start with a minus sign)");
                }
            }
            default -> throw bad("Unknown setting: " + key);
        }
    }

    private Map<String, String> read(List<String> keys) {
        Map<String, String> map = new LinkedHashMap<>();
        for (String key : keys) {
            map.put(key, settings.findById(key).map(Setting::getValue).orElse(""));
        }
        return map;
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}