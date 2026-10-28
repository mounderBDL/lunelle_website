package com.lunelle.backend.config;

import com.lunelle.backend.admin.AdminUser;
import com.lunelle.backend.admin.AdminUserRepository;
import com.lunelle.backend.setting.Setting;
import com.lunelle.backend.setting.SettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private final AdminUserRepository admins;
    private final SettingRepository settings;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // The admin is created only when NO admin exists. Later changes go through the app, not .env.
        if (admins.count() == 0) {
            if (adminEmail.isBlank() || adminPassword.isBlank()) {
                log.warn("No admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD for the first start.");
            } else {
                AdminUser admin = new AdminUser();
                admin.setEmail(adminEmail.trim());
                admin.setPasswordHash(passwordEncoder.encode(adminPassword));
                admin.setName("Admin");
                admins.save(admin);
                log.info("Admin account created for {}", adminEmail);
            }
        }

        Map<String, String> defaults = Map.of(
                "store_name", "Lunelle",
                "contact_phone", "",
                "telegram_chat_id", "");
        defaults.forEach((key, value) -> {
            if (!settings.existsById(key)) {
                settings.save(new Setting(key, value));
            }
        });
    }
}