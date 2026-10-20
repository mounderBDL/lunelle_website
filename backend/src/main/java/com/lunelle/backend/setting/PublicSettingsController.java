package com.lunelle.backend.setting;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "Settings (public)")
@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class PublicSettingsController {

    private final SettingsService service;

    /** Store name, contact phone, Instagram link: for the storefront header and footer. */
    @GetMapping
    public Map<String, String> get() {
        return service.publicSettings();
    }
}