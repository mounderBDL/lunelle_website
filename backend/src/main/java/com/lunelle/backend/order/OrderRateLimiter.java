package com.lunelle.backend.order;

import com.lunelle.backend.common.AttemptStore;
import com.lunelle.backend.common.CodedException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

/**
 * Caps how many orders one client IP can try to place per hour. Every order holds stock until the team
 * confirms or cancels it, so without this a bot rotating made-up phone numbers could mark the whole shop
 * out of stock. (The per-phone limit in CheckoutService does nothing against made-up numbers.)
 *
 * <p>Mobile carriers put many customers behind one address (CGNAT), so the cap is generous: a small shop
 * won't see this many real orders from one address in an hour.
 *
 * <p>The attempt is recorded first and counted after, both against the database, so a burst of parallel
 * requests can't all slip through the check at once.
 */
@Service
public class OrderRateLimiter {

    public static final int MAX_ORDERS_PER_IP_PER_HOUR = 10;
    /** Must not be longer than what AttemptStore keeps (1 hour). */
    static final Duration WINDOW = Duration.ofHours(1);
    private static final String SCOPE = "order";

    private final AttemptStore store;

    public OrderRateLimiter(AttemptStore store) {
        this.store = store;
    }

    /** Counts one order attempt for this client; throws 429 past the hourly cap. Does nothing if the IP is unknown. */
    public void acquire(String ip) {
        if (ip == null) {
            return;
        }
        String key = "ip:" + ip;
        store.record(SCOPE, List.of(key));
        int recent = store.counts(SCOPE, List.of(key), WINDOW).getOrDefault(key, 0);
        if (recent > MAX_ORDERS_PER_IP_PER_HOUR) {
            throw new CodedException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_ORDERS",
                    "Too many orders from this connection. Please contact us.");
        }
    }
}
