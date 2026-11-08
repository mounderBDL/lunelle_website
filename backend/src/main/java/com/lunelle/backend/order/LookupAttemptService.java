package com.lunelle.backend.order;

import com.lunelle.backend.common.AttemptStore;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Limits failed order lookups (code + phone), kept in the database (see {@link AttemptStore}).
 * Failures are counted per order code and per phone number, plus a global cap, so neither
 * "known phone, guessed codes" nor "known code, guessed phones" can be tried at scale.
 * Restarts and extra server copies do not reset the counts.
 */
@Service
public class LookupAttemptService {

    public static final int MAX_FAILURES_PER_KEY = 8;
    public static final int MAX_GLOBAL_FAILURES = 300;
    public static final Duration WINDOW = Duration.ofMinutes(15);
    private static final String SCOPE = "lookup";

    private final AttemptStore store;

    public LookupAttemptService(AttemptStore store) {
        this.store = store;
    }

    /** Throws 429 when any of the keys, or the whole system, has had too many recent failures. */
    public void assertAllowed(String... keys) {
        Map<String, Integer> counts = store.counts(SCOPE, List.of(keys), WINDOW);
        boolean blocked = counts.getOrDefault(AttemptStore.ANY, 0) >= MAX_GLOBAL_FAILURES;
        for (String key : keys) {
            if (counts.getOrDefault(key, 0) >= MAX_FAILURES_PER_KEY) {
                blocked = true;
            }
        }
        if (blocked) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many attempts. Please try again in a few minutes.");
        }
    }

    public void recordFailure(String... keys) {
        store.record(SCOPE, List.of(keys));
    }
}