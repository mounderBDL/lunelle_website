package com.lunelle.backend.order;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, UUID> {
    Optional<CustomerOrder> findByPublicToken(String publicToken);
    Optional<CustomerOrder> findByCodeAndPhone(String code, String phone);
    long countByPhoneAndCreatedAtAfter(String phone, Instant since);
}