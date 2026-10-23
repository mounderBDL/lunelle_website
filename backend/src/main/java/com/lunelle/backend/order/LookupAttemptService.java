package com.lunelle.backend.order;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;

/**
 * Limits failed order lookups (code + phone), in memory. Failures are counted per order code and
 * per phone number, plus a global cap, so neither "known phone, guessed codes" nor
 * "known code, guessed phones" can be tried at scale. A restart clears the counters.
 */
@Service
public class LookupAttemptService {

    static final int MAX_FAILURES_PER_KEY = 8;
    static final int MAX_GLOBAL_FAILURES = 300;
    static final Duration WINDOW = Duration.ofMinutes(15);
    private static final int MAX_TRACKED_KEYS = 10_000;

    private final Map<String, Deque<Instant>> failures = new HashMap<>();
    private final Deque<Instant> global = new ArrayDeque<>();

    /** Throws 429 when any of the keys, or the whole system, has had too many recent failures. */
    public synchronized void assertAllowed(String... keys) {
        Instant now = Instant.now();
        prune(global, now);
        boolean blocked = global.size() >= MAX_GLOBAL_FAILURES;
        for (String key : keys) {
            Deque<Instant> own = failures.get(key);
            if (own == null) {
                continue;
            }
            prune(own, now);
            if (own.isEmpty()) {
                failures.remove(key);
            } else if (own.size() >= MAX_FAILURES_PER_KEY) {
                blocked = true;
            }
        }
        if (blocked) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many attempts. Please try again in a few minutes.");
        }
    }

    public synchronized void recordFailure(String... keys) {
        Instant now = Instant.now();
        global.addLast(now);
        if (failures.size() >= MAX_TRACKED_KEYS) {
            failures.values().removeIf(q -> {
                prune(q, now);
                return q.isEmpty();
            });
        }
        if (failures.size() < MAX_TRACKED_KEYS) {
            for (String key : keys) {
                failures.computeIfAbsent(key, k -> new ArrayDeque<>()).addLast(now);
            }
        }
    }

    private void prune(Deque<Instant> queue, Instant now) {
        Instant limit = now.minus(WINDOW);
        while (!queue.isEmpty() && queue.peekFirst().isBefore(limit)) {
            queue.pollFirst();
        }
    }
}