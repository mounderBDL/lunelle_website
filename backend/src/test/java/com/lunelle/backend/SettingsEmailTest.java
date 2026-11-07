package com.lunelle.backend;

import com.lunelle.backend.setting.SettingsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SettingsEmailTest extends IntegrationTestBase {

    @Autowired
    private SettingsService settings;

    @Test
    void theBusinessEmailIsSavedAndShownToTheShop() {
        settings.update(Map.of("contact_email", "  hello@lunelle.dz "));
        assertThat(settings.publicSettings()).containsEntry("contact_email", "hello@lunelle.dz");
        assertThat(settings.adminSettings()).containsEntry("contact_email", "hello@lunelle.dz");

        settings.update(Map.of("contact_email", ""));
        assertThat(settings.publicSettings()).containsEntry("contact_email", "");
    }

    @Test
    void anInvalidEmailIsRejected() {
        for (String bad : new String[] {"hello", "a@b", "a b@c.dz", "@lunelle.dz"}) {
            assertThatThrownBy(() -> settings.update(Map.of("contact_email", bad)))
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            e -> assertThat(e.getStatusCode().value()).isEqualTo(400));
        }
    }
}