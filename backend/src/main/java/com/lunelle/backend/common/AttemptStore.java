package com.lunelle.backend.common;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Failed attempts kept in PostgreSQL, so they survive a restart and are the same for every server copy.
 * Used by the login limiter and the order-lookup limiter, each under its own scope.
 */
@Component
public class AttemptStore {

    /** Every failure of a scope is also counted under this key: the "whole system" cap. */
    public static final String ANY = "*";

    private static final Duration KEEP = Duration.ofHours(1);
    private static final int MAX_KEY = 300;

    private final JdbcClient jdbc;
    private final Clock clock;

    @Autowired
    public AttemptStore(JdbcClient jdbc) {
        this(jdbc, Clock.systemUTC());
    }

    public AttemptStore(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    /** Failures inside the window for each key, plus the scope-wide total under {@link #ANY}. */
    public Map<String, Integer> counts(String scope, Collection<String> keys, Duration window) {
        Map<String, String> original = new HashMap<>();
        for (String key : keys) {
            original.put(norm(key), key);
        }
        List<String> wanted = new ArrayList<>(original.keySet());
        wanted.add(ANY);

        Map<String, Integer> result = new HashMap<>();
        jdbc.sql("select attempt_key, count(*) from attempt_failure "
                        + "where scope = :scope and created_at > :since and attempt_key in (:keys) "
                        + "group by attempt_key")
                .param("scope", scope)
                .param("since", at(clock.instant().minus(window)))
                .param("keys", wanted)
                .query((rs, n) -> Map.entry(rs.getString(1), rs.getInt(2)))
                .list()
                .forEach(e -> result.put(original.getOrDefault(e.getKey(), e.getKey()), e.getValue()));
        return result;
    }

    /** Records one failure for each key, and one for the whole scope. Commits on its own, even if the caller rolls back. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(String scope, Collection<String> keys) {
        OffsetDateTime now = at(clock.instant());
        for (String key : keys) {
            insert(scope, norm(key), now);
        }
        insert(scope, ANY, now);
        jdbc.sql("delete from attempt_failure where created_at < :old")
                .param("old", at(clock.instant().minus(KEEP)))
                .update();
    }

    /** Forgets the failures of one key (a successful login). The scope-wide count is left alone. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void clear(String scope, String key) {
        jdbc.sql("delete from attempt_failure where scope = :scope and attempt_key = :key")
                .param("scope", scope)
                .param("key", norm(key))
                .update();
    }

    private void insert(String scope, String key, OffsetDateTime at) {
        jdbc.sql("insert into attempt_failure (scope, attempt_key, created_at) values (:scope, :key, :at)")
                .param("scope", scope)
                .param("key", key)
                .param("at", at)
                .update();
    }

    private static String norm(String key) {
        return key.length() > MAX_KEY ? key.substring(0, MAX_KEY) : key;
    }

    private static OffsetDateTime at(Instant instant) {
        return OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
    }
}