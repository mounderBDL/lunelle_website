package com.lunelle.backend.auth;

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
 * Brute-force protection for the studio login, kept in the database (see {@link AttemptStore}).
 *
 * <p>When the client IP is known, the limits are per IP: one attacker is stopped after a few guesses on an
 * account and a few dozen overall, and can never lock the real admin out from somewhere else. The account-wide
 * cap is high, so only an attack spread over many addresses reaches it.
 *
 * <p>When the IP is unknown (no proxy header configured), the old strict per-account limit applies.
 *
 * <p>There is no system-wide lock (that would let anyone lock every admin out); a burst of failures is only logged.
 */
@Slf4j
@Service
public class LoginAttemptService {

    public static final int MAX_FAILURES_PER_IP_AND_ACCOUNT = 5;
    public static final int MAX_FAILURES_PER_IP = 20;
    public static final int MAX_FAILURES_PER_ACCOUNT = 50;
    /** Used instead of the per-IP limits when the client IP is unknown. */
    public static final int MAX_FAILURES_PER_ACCOUNT_UNKNOWN_IP = 5;
    /** Failures across the whole login in WINDOW that trigger a warning in the logs (never a lock). */
    public static final int ALERT_GLOBAL_FAILURES = 100;
    public static final Duration WINDOW = Duration.ofMinutes(15);
    private static final String SCOPE = "login";

    private final AttemptStore store;
    private volatile Instant lastAlert = Instant.EPOCH;

    public LoginAttemptService(AttemptStore store) {
        this.store = store;
    }

    /**
     * Throws 429 when this account / client has had too many recent failures.
     * @param account the email being logged into (or another per-account key)
     * @param ip      the client's rate-limit key from ClientIps, or null if unknown
     */
    public void assertAllowed(String account, String ip) {
        Map<String, Integer> counts = store.counts(SCOPE, keys(account, ip), WINDOW);
        int perAccount = counts.getOrDefault(accountKey(account), 0);
        boolean blocked;
        if (ip == null) {
            blocked = perAccount >= MAX_FAILURES_PER_ACCOUNT_UNKNOWN_IP;
        } else {
            blocked = counts.getOrDefault(ipAccountKey(account, ip), 0) >= MAX_FAILURES_PER_IP_AND_ACCOUNT
                    || counts.getOrDefault(ipKey(ip), 0) >= MAX_FAILURES_PER_IP
                    || perAccount >= MAX_FAILURES_PER_ACCOUNT;
        }
        alertIfBusy(counts.getOrDefault(AttemptStore.ANY, 0));
        if (blocked) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many failed attempts. Please try again in a few minutes.");
        }
    }

    public void recordFailure(String account, String ip) {
        store.record(SCOPE, keys(account, ip));
    }

    /** After a successful login: forgets this account's failures (the per-IP count is kept). */
    public void reset(String account, String ip) {
        List<String> keys = new ArrayList<>(List.of(accountKey(account)));
        if (ip != null) {
            keys.add(ipAccountKey(account, ip));
        }
        store.clear(SCOPE, keys);
    }

    private static List<String> keys(String account, String ip) {
        return ip == null
                ? List.of(accountKey(account))
                : List.of(accountKey(account), ipKey(ip), ipAccountKey(account, ip));
    }

    private static String accountKey(String account) {
        return "acct:" + account;
    }

    private static String ipKey(String ip) {
        return "ip:" + ip;
    }

    private static String ipAccountKey(String account, String ip) {
        return "ip-acct:" + ip + "|" + account;
    }

    private void alertIfBusy(int globalFailures) {
        Instant now = Instant.now();
        if (globalFailures >= ALERT_GLOBAL_FAILURES && now.isAfter(lastAlert.plus(Duration.ofMinutes(5)))) {
            lastAlert = now;
            log.warn("{} failed studio logins in the last {} minutes: possible password-guessing attack",
                    globalFailures, WINDOW.toMinutes());
        }
    }
}
