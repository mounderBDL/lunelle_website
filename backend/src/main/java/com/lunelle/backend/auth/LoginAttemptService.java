package com.lunelle.backend.auth;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;

/**
 * In-memory brute-force protection (single server instance).
 * A key (email) is locked after MAX_FAILURES failures inside WINDOW; a global cap stops
 * attackers who rotate emails. A restart clears everything.
 */
@Service
public class LoginAttemptService {

    static final int MAX_FAILURES = 5;
    static final int MAX_GLOBAL_FAILURES = 50;
    static final Duration WINDOW = Duration.ofMinutes(15);
    private static final int MAX_TRACKED_KEYS = 10_000;

    private final Clock clock;
    private final Map<String, Deque<Instant>> failures = new HashMap<>();
    private final Deque<Instant> globalFailures = new ArrayDeque<>();

    @Autowired
    public LoginAttemptService() {
        this(Clock.systemUTC());
    }

    LoginAttemptService(Clock clock) {
        this.clock = clock;
    }

    /** Throws 429 when this key (or the whole system) has had too many recent failures. */
    public synchronized void assertAllowed(String key) {
        Instant now = clock.instant();
        prune(globalFailures, now);
        Deque<Instant> own = failures.get(key);
        if (own != null) {
            prune(own, now);
            if (own.isEmpty()) {
                failures.remove(key);
                own = null;
            }
        }
        if (globalFailures.size() >= MAX_GLOBAL_FAILURES || (own != null && own.size() >= MAX_FAILURES)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many failed attempts. Please try again in a few minutes.");
        }
    }

    public synchronized void recordFailure(String key) {
        Instant now = clock.instant();
        globalFailures.addLast(now);
        if (failures.size() >= MAX_TRACKED_KEYS) {
            failures.values().removeIf(q -> {
                prune(q, now);
                return q.isEmpty();
            });
        }
        if (failures.size() < MAX_TRACKED_KEYS) {
            failures.computeIfAbsent(key, k -> new ArrayDeque<>()).addLast(now);
        }
    }

    public synchronized void reset(String key) {
        failures.remove(key);
    }

    private void prune(Deque<Instant> queue, Instant now) {
        Instant limit = now.minus(WINDOW);
        while (!queue.isEmpty() && queue.peekFirst().isBefore(limit)) {
            queue.pollFirst();
        }
    }
}