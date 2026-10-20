package com.lunelle.backend.setting;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "Settings (admin)")
@RestController
@RequestMapping("/api/admin/settings")
@RequiredArgsConstructor
public class AdminSettingsController {

    private final SettingsService service;

    @GetMapping
    public Map<String, String> get() {
        return service.adminSettings();
    }

    /** Send only the keys to change, e.g. {"telegram_chat_id": "123456789"}. */
    @PutMapping
    public Map<String, String> update(@RequestBody Map<String, String> changes) {
        return service.update(changes);
    }
}