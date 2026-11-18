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

    private static final String ADMIN = "admin@x.com";
    private static final String ATTACKER_IP = "203.0.113.7";
    private static final String ADMIN_IP = "198.51.100.20";

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

    private void failLogin(String account, String ip, int times) {
        for (int i = 0; i < times; i++) {
            login.recordFailure(account, ip);
        }
    }

    // ───── login, client IP known ─────

    @Test
    void anAttackerCannotLockTheAdminOut() {
        failLogin(ADMIN, ATTACKER_IP, LoginAttemptService.MAX_FAILURES_PER_IP_AND_ACCOUNT);

        assertThatThrownBy(() -> login.assertAllowed(ADMIN, ATTACKER_IP)).satisfies(AttemptLimitTest::assert429);
        assertThatCode(() -> login.assertAllowed(ADMIN, ADMIN_IP)).doesNotThrowAnyException();
    }

    @Test
    void oneAddressRotatingEmailsIsStopped() {
        for (int i = 0; i < LoginAttemptService.MAX_FAILURES_PER_IP; i++) {
            login.recordFailure("guess" + i + "@x.com", ATTACKER_IP);
        }
        assertThatThrownBy(() -> login.assertAllowed("fresh@x.com", ATTACKER_IP)).satisfies(AttemptLimitTest::assert429);
        assertThatCode(() -> login.assertAllowed("fresh@x.com", ADMIN_IP)).doesNotThrowAnyException();
    }

    @Test
    void anAttackSpreadOverManyAddressesLocksTheAccount() {
        for (int i = 0; i < LoginAttemptService.MAX_FAILURES_PER_ACCOUNT; i++) {
            login.recordFailure(ADMIN, "203.0.113." + i);
        }
        assertThatThrownBy(() -> login.assertAllowed(ADMIN, ADMIN_IP)).satisfies(AttemptLimitTest::assert429);
    }

    @Test
    void thereIsNoSystemWideLock() {
        for (int i = 0; i < 200; i++) {
            login.recordFailure("guess" + i + "@x.com", "10.0." + (i / 100) + "." + (i % 100));
        }
        assertThatCode(() -> login.assertAllowed(ADMIN, ADMIN_IP)).doesNotThrowAnyException();
    }

    @Test
    void aSuccessfulLoginClearsTheAccountFailures() {
        failLogin(ADMIN, ADMIN_IP, 4);
        login.reset(ADMIN, ADMIN_IP);
        failLogin(ADMIN, ADMIN_IP, 4);
        assertThatCode(() -> login.assertAllowed(ADMIN, ADMIN_IP)).doesNotThrowAnyException();
    }

    // ───── login, client IP unknown (no proxy header configured) ─────

    @Test
    void withoutAnIpTheAccountLocksAfterFiveFailures() {
        failLogin(ADMIN, null, 4);
        assertThatCode(() -> login.assertAllowed(ADMIN, null)).doesNotThrowAnyException();
        failLogin(ADMIN, null, 1);
        assertThatThrownBy(() -> login.assertAllowed(ADMIN, null)).satisfies(AttemptLimitTest::assert429);
        assertThatCode(() -> login.assertAllowed("someone@else.com", null)).doesNotThrowAnyException();
    }

    @Test
    void unlocksWhenTheWindowHasPassed() {
        failLogin(ADMIN, null, 5);
        clock.now = clock.now.plus(LoginAttemptService.WINDOW).plus(Duration.ofSeconds(1));
        assertThatCode(() -> login.assertAllowed(ADMIN, null)).doesNotThrowAnyException();
    }

    @Test
    void failuresSurviveARestart() {
        failLogin(ADMIN, null, 5);

        // a brand-new service on the same database, like a server that just restarted
        LoginAttemptService afterRestart = new LoginAttemptService(new AttemptStore(jdbc, clock));
        assertThatThrownBy(() -> afterRestart.assertAllowed(ADMIN, null)).satisfies(AttemptLimitTest::assert429);
    }

    // ───── order lookup ─────

    @Test
    void aKeyWithTooManyFailuresIsBlockedButOthersAreNot() {
        for (int i = 0; i < LookupAttemptService.MAX_FAILURES_PER_KEY; i++) {
            lookup.recordFailure(null, "code:LN-000001", "phone:0551111111");
        }
        assertThatThrownBy(() -> lookup.assertAllowed(null, "code:LN-000002", "phone:0551111111"))
                .satisfies(AttemptLimitTest::assert429);
        assertThatCode(() -> lookup.assertAllowed(null, "code:LN-000002", "phone:0552222222"))
                .doesNotThrowAnyException();
    }

    @Test
    void oneAddressGuessingManyOrdersIsStopped() {
        for (int i = 0; i < LookupAttemptService.MAX_FAILURES_PER_IP; i++) {
            lookup.recordFailure(ATTACKER_IP, "code:LN-" + i, "phone:05500000" + i);
        }
        assertThatThrownBy(() -> lookup.assertAllowed(ATTACKER_IP, "code:LN-999999", "phone:0559999999"))
                .satisfies(AttemptLimitTest::assert429);
        assertThatCode(() -> lookup.assertAllowed(ADMIN_IP, "code:LN-999999", "phone:0559999999"))
                .doesNotThrowAnyException();
    }

    @Test
    void lookupHasNoSystemWideLock() {
        for (int i = 0; i < LookupAttemptService.ALERT_GLOBAL_FAILURES; i++) {
            lookup.recordFailure(null, "phone:" + i);
        }
        assertThatCode(() -> lookup.assertAllowed(null, "code:LN-000009", "phone:0559999999"))
                .doesNotThrowAnyException();
    }

    // ───── both together ─────

    @Test
    void loginAndLookupCountSeparately() {
        for (int i = 0; i < LoginAttemptService.MAX_FAILURES_PER_IP; i++) {
            login.recordFailure("guess" + i + "@x.com", ATTACKER_IP);
        }
        // this address is locked out of the login, not out of the order lookup
        assertThatCode(() -> lookup.assertAllowed(ATTACKER_IP, "code:LN-000001", "phone:0551111111"))
                .doesNotThrowAnyException();
    }
}
