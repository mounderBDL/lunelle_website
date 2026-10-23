package com.lunelle.backend.order;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LookupAttemptServiceTest {

    private final LookupAttemptService service = new LookupAttemptService();

    private static void assert429(Throwable t) {
        assertThat(t).isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode().value()).isEqualTo(429));
    }

    @Test
    void aKeyWithTooManyFailuresIsBlockedButOthersAreNot() {
        for (int i = 0; i < LookupAttemptService.MAX_FAILURES_PER_KEY; i++) {
            service.recordFailure("code:LN-000001", "phone:0551111111");
        }
        assertThatThrownBy(() -> service.assertAllowed("code:LN-000002", "phone:0551111111"))
                .satisfies(LookupAttemptServiceTest::assert429);
        assertThatCode(() -> service.assertAllowed("code:LN-000002", "phone:0552222222"))
                .doesNotThrowAnyException();
    }

    @Test
    void theGlobalCapBlocksEveryone() {
        for (int i = 0; i < LookupAttemptService.MAX_GLOBAL_FAILURES; i++) {
            service.recordFailure("phone:" + i);
        }
        assertThatThrownBy(() -> service.assertAllowed("code:LN-000009", "phone:0559999999"))
                .satisfies(LookupAttemptServiceTest::assert429);
    }
}
