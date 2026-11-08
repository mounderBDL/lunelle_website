package com.lunelle.backend;

import com.lunelle.backend.auth.LoginAttemptService;
import com.lunelle.backend.common.AttemptStore;
import com.lunelle.backend.order.LookupAttemptService;
import org.junit.jupiter.api.BeforeEach;
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

class AttemptLimitTest extends IntegrationTestBase {

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
    private LoginAttemptService login;
    private LookupAttemptService lookup;

    @BeforeEach
    void services() {
        AttemptStore store = new AttemptStore(jdbc, clock);
        login = new LoginAttemptService(store);
        lookup = new LookupAttemptService(store);
    }

    private static void assert429(Throwable t) {
        assertThat(t).isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode().value()).isEqualTo(429));
    }

    private void failLogin(String key, int times) {
        for (int i = 0; i < times; i++) {
            login.recordFailure(key);
        }
    }

    // ───── login ─────

    @Test
    void locksAnEmailAfterFiveFailures() {
        failLogin("admin@x.com", 4);
        assertThatCode(() -> login.assertAllowed("admin@x.com")).doesNotThrowAnyException();
        failLogin("admin@x.com", 1);
        assertThatThrownBy(() -> login.assertAllowed("admin@x.com")).satisfies(AttemptLimitTest::assert429);
    }

    @Test
    void otherEmailsAreNotAffected() {
        failLogin("admin@x.com", 5);
        assertThatCode(() -> login.assertAllowed("someone@else.com")).doesNotThrowAnyException();
    }

    @Test
    void unlocksWhenTheWindowHasPassed() {
        failLogin("admin@x.com", 5);
        clock.now = clock.now.plus(LoginAttemptService.WINDOW).plus(Duration.ofSeconds(1));
        assertThatCode(() -> login.assertAllowed("admin@x.com")).doesNotThrowAnyException();
    }

    @Test
    void aSuccessfulLoginClearsTheFailures() {
        failLogin("admin@x.com", 4);
        login.reset("admin@x.com");
        failLogin("admin@x.com", 4);
        assertThatCode(() -> login.assertAllowed("admin@x.com")).doesNotThrowAnyException();
    }

    @Test
    void globalCapStopsAttackersWhoRotateEmails() {
        for (int i = 0; i < LoginAttemptService.MAX_GLOBAL_FAILURES; i++) {
            login.recordFailure("attacker" + i + "@x.com");
        }
        assertThatThrownBy(() -> login.assertAllowed("fresh@x.com")).satisfies(AttemptLimitTest::assert429);
    }

    @Test
    void failuresSurviveARestart() {
        failLogin("admin@x.com", 5);

        // a brand-new service on the same database, like a server that just restarted
        LoginAttemptService afterRestart = new LoginAttemptService(new AttemptStore(jdbc, clock));
        assertThatThrownBy(() -> afterRestart.assertAllowed("admin@x.com")).satisfies(AttemptLimitTest::assert429);
    }

    // ───── order lookup ─────

    @Test
    void aKeyWithTooManyFailuresIsBlockedButOthersAreNot() {
        for (int i = 0; i < LookupAttemptService.MAX_FAILURES_PER_KEY; i++) {
            lookup.recordFailure("code:LN-000001", "phone:0551111111");
        }
        assertThatThrownBy(() -> lookup.assertAllowed("code:LN-000002", "phone:0551111111"))
                .satisfies(AttemptLimitTest::assert429);
        assertThatCode(() -> lookup.assertAllowed("code:LN-000002", "phone:0552222222"))
                .doesNotThrowAnyException();
    }

    @Test
    void theGlobalCapBlocksEveryone() {
        for (int i = 0; i < LookupAttemptService.MAX_GLOBAL_FAILURES; i++) {
            lookup.recordFailure("phone:" + i);
        }
        assertThatThrownBy(() -> lookup.assertAllowed("code:LN-000009", "phone:0559999999"))
                .satisfies(AttemptLimitTest::assert429);
    }

    // ───── both together ─────

    @Test
    void loginAndLookupCountSeparately() {
        for (int i = 0; i < LoginAttemptService.MAX_GLOBAL_FAILURES; i++) {
            login.recordFailure("attacker" + i + "@x.com");
        }
        // the whole login system is locked, the order lookup is not
        assertThatCode(() -> lookup.assertAllowed("code:LN-000001", "phone:0551111111"))
                .doesNotThrowAnyException();
    }
}