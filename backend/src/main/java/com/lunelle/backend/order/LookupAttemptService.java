package com.lunelle.backend.order;

import com.lunelle.backend.common.AttemptStore;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Limits failed order lookups (code + phone), kept in the database (see {@link AttemptStore}).
 * Failures are counted per order code and per phone number, so neither "known phone, guessed codes" nor
 * "known code, guessed phones" can be tried at scale; and per client IP (when known), so one visitor can't
 * hammer the form. Guessing both at once is hopeless (a valid code AND its matching phone are needed).
 *
 * <p>There is no system-wide lock (one attacker could switch tracking off for every customer);
 * a burst of failures is only logged.
 */
@Slf4j
@Service
public class LookupAttemptService {

    public static final int MAX_FAILURES_PER_KEY = 8;
    public static final int MAX_FAILURES_PER_IP = 30;
    /** Failures in WINDOW that trigger a warning in the logs (never a lock). */
    public static final int ALERT_GLOBAL_FAILURES = 300;
    public static final Duration WINDOW = Duration.ofMinutes(15);
    private static final String SCOPE = "lookup";

    private final AttemptStore store;
    private volatile Instant lastAlert = Instant.EPOCH;

    public LookupAttemptService(AttemptStore store) {
        this.store = store;
    }

    /**
     * Throws 429 when any of the keys, or this client, has had too many recent failures.
     * @param ip the client's rate-limit key from ClientIps, or null if unknown
     */
    public void assertAllowed(String ip, String... keys) {
        Map<String, Integer> counts = store.counts(SCOPE, all(ip, keys), WINDOW);
        boolean blocked = ip != null && counts.getOrDefault(ipKey(ip), 0) >= MAX_FAILURES_PER_IP;
        for (String key : keys) {
            if (counts.getOrDefault(key, 0) >= MAX_FAILURES_PER_KEY) {
                blocked = true;
            }
        }
        alertIfBusy(counts.getOrDefault(AttemptStore.ANY, 0));
        if (blocked) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many attempts. Please try again in a few minutes.");
        }
    }

    public void recordFailure(String ip, String... keys) {
        store.record(SCOPE, all(ip, keys));
    }

    private static List<String> all(String ip, String... keys) {
        List<String> all = new ArrayList<>(List.of(keys));
        if (ip != null) {
            all.add(ipKey(ip));
        }
        return all;
    }

    private static String ipKey(String ip) {
        return "ip:" + ip;
    }

    private void alertIfBusy(int globalFailures) {
        Instant now = Instant.now();
        if (globalFailures >= ALERT_GLOBAL_FAILURES && now.isAfter(lastAlert.plus(Duration.ofMinutes(5)))) {
            lastAlert = now;
            log.warn("{} failed order lookups in the last {} minutes: someone may be guessing orders",
                    globalFailures, WINDOW.toMinutes());
        }
    }
}
