package com.lunelle.backend.auth;

import com.lunelle.backend.common.AttemptStore;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Brute-force protection for the studio login, kept in the database (see {@link AttemptStore}).
 * A key (email) is locked after MAX_FAILURES failures inside WINDOW; a global cap stops
 * attackers who rotate emails. Restarts and extra server copies do not reset the counts.
 */
@Service
public class LoginAttemptService {

    public static final int MAX_FAILURES = 5;
    public static final int MAX_GLOBAL_FAILURES = 50;
    public static final Duration WINDOW = Duration.ofMinutes(15);
    private static final String SCOPE = "login";

    private final AttemptStore store;

    public LoginAttemptService(AttemptStore store) {
        this.store = store;
    }

    /** Throws 429 when this key (or the whole system) has had too many recent failures. */
    public void assertAllowed(String key) {
        Map<String, Integer> counts = store.counts(SCOPE, List.of(key), WINDOW);
        if (counts.getOrDefault(AttemptStore.ANY, 0) >= MAX_GLOBAL_FAILURES
                || counts.getOrDefault(key, 0) >= MAX_FAILURES) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many failed attempts. Please try again in a few minutes.");
        }
    }

    public void recordFailure(String key) {
        store.record(SCOPE, List.of(key));
    }

    public void reset(String key) {
        store.clear(SCOPE, key);
    }
}