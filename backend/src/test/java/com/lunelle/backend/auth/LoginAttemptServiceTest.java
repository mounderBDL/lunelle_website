package com.lunelle.backend.auth;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LoginAttemptServiceTest {

    static class TestClock extends Clock {
        Instant now = Instant.parse("2026-10-20T12:00:00Z");

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    private final TestClock clock = new TestClock();
    private final LoginAttemptService service = new LoginAttemptService(clock);

    private void fail(String key, int times) {
        for (int i = 0; i < times; i++) {
            service.recordFailure(key);
        }
    }

    @Test
    void locksAnEmailAfterFiveFailures() {
        fail("admin@x.com", 4);
        assertThatCode(() -> service.assertAllowed("admin@x.com")).doesNotThrowAnyException();
        fail("admin@x.com", 1);
        assertThatThrownBy(() -> service.assertAllowed("admin@x.com"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode().value()).isEqualTo(429));
    }

    @Test
    void otherEmailsAreNotAffected() {
        fail("admin@x.com", 5);
        assertThatCode(() -> service.assertAllowed("someone@else.com")).doesNotThrowAnyException();
    }

    @Test
    void unlocksWhenTheWindowHasPassed() {
        fail("admin@x.com", 5);
        clock.now = clock.now.plus(LoginAttemptService.WINDOW).plus(Duration.ofSeconds(1));
        assertThatCode(() -> service.assertAllowed("admin@x.com")).doesNotThrowAnyException();
    }

    @Test
    void aSuccessfulLoginClearsTheFailures() {
        fail("admin@x.com", 4);
        service.reset("admin@x.com");
        fail("admin@x.com", 4);
        assertThatCode(() -> service.assertAllowed("admin@x.com")).doesNotThrowAnyException();
    }

    @Test
    void globalCapStopsAttackersWhoRotateEmails() {
        for (int i = 0; i < LoginAttemptService.MAX_GLOBAL_FAILURES; i++) {
            service.recordFailure("attacker" + i + "@x.com");
        }
        assertThatThrownBy(() -> service.assertAllowed("fresh@x.com"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode().value()).isEqualTo(429));
    }
}