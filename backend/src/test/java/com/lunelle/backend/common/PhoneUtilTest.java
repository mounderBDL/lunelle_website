package com.lunelle.backend.common;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PhoneUtilTest {

    @Test
    void normalizesTheUsualWaysOfWritingANumber() {
        assertThat(PhoneUtil.normalize("0551234567")).isEqualTo("0551234567");
        assertThat(PhoneUtil.normalize("+213 551 23 45 67")).isEqualTo("0551234567");
        assertThat(PhoneUtil.normalize("00213551234567")).isEqualTo("0551234567");
        assertThat(PhoneUtil.normalize("551234567")).isEqualTo("0551234567");
        assertThat(PhoneUtil.normalize("05-51-23-45-67")).isEqualTo("0551234567");
        assertThat(PhoneUtil.normalize("+213 (0) 551 234 567")).isEqualTo("0551234567");
    }

    @Test
    void acceptsArabicIndicDigits() {
        assertThat(PhoneUtil.normalize("٠٥٥١٢٣٤٥٦٧")).isEqualTo("0551234567");
    }

    @Test
    void rejectsNumbersThatAreNotAlgerianMobiles() {
        for (String bad : new String[]{"12345", "0451234567", "05512345", "05512345678", "abc", ""}) {
            assertThatThrownBy(() -> PhoneUtil.normalize(bad))
                    .as("input: " + bad)
                    .isInstanceOf(ResponseStatusException.class);
        }
        assertThatThrownBy(() -> PhoneUtil.normalize(null)).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void masksAllButTheEnds() {
        assertThat(PhoneUtil.mask("0551234567")).isEqualTo("05******67");
    }
}