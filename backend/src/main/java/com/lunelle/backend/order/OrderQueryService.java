package com.lunelle.backend.order;

import com.lunelle.backend.common.PhoneUtil;
import com.lunelle.backend.order.OrderDtos.OrderSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OrderQueryService {

    private final CustomerOrderRepository orders;
    private final LookupAttemptService attempts;

    /** The private link given at checkout: whoever holds the token sees the whole order. */
    @Transactional(readOnly = true)
    public OrderSummaryDto byToken(String token) {
        return orders.findByPublicToken(token)
                .map(o -> OrderMapper.summary(o))
                .orElseThrow(OrderQueryService::notFound);
    }

    /** Customer lookup: order code + phone number. Rate-limited; the street address is never returned. */
    @Transactional(readOnly = true)
    public OrderSummaryDto lookup(String code, String phone) {
        String normalizedCode = code.trim().toUpperCase(Locale.ROOT);
        String normalizedPhone = null;
        try {
            normalizedPhone = PhoneUtil.normalize(phone);
        } catch (ResponseStatusException ignored) {
            // an invalid number is simply a failed attempt (same answer as a wrong one)
        }
        String[] keys = normalizedPhone == null
                ? new String[]{"code:" + normalizedCode}
                : new String[]{"code:" + normalizedCode, "phone:" + normalizedPhone};
        attempts.assertAllowed(keys);

        Optional<CustomerOrder> found = normalizedPhone == null
                ? Optional.empty()
                : orders.findByCodeAndPhone(normalizedCode, normalizedPhone);
        if (found.isEmpty()) {
            attempts.recordFailure(keys);
            throw notFound();
        }
        return OrderMapper.summary(found.get(), false);
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found");
    }
}