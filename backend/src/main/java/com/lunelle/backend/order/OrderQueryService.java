package com.lunelle.backend.order;

import com.lunelle.backend.common.PhoneUtil;
import com.lunelle.backend.order.OrderDtos.OrderSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class OrderQueryService {

    private final CustomerOrderRepository orders;

    @Transactional(readOnly = true)
    public OrderSummaryDto byToken(String token) {
        return orders.findByPublicToken(token)
                .map(OrderMapper::summary)
                .orElseThrow(OrderQueryService::notFound);
    }

    /** Customer lookup: the order code plus the phone number used at checkout. */
    @Transactional(readOnly = true)
    public OrderSummaryDto lookup(String code, String phone) {
        String normalized;
        try {
            normalized = PhoneUtil.normalize(phone);
        } catch (ResponseStatusException e) {
            throw notFound(); // same answer whatever is wrong: nothing to enumerate
        }
        return orders.findByCodeAndPhone(code.trim().toUpperCase(Locale.ROOT), normalized)
                .map(OrderMapper::summary)
                .orElseThrow(OrderQueryService::notFound);
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found");
    }
}