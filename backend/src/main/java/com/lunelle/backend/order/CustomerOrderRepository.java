package com.lunelle.backend.order;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CustomerOrderRepository
        extends JpaRepository<CustomerOrder, UUID>, JpaSpecificationExecutor<CustomerOrder> {

    Optional<CustomerOrder> findByPublicToken(String publicToken);

    Optional<CustomerOrder> findByIdempotencyKey(String idempotencyKey);    

    Optional<CustomerOrder> findByCodeAndPhone(String code, String phone);

    long countByPhoneAndCreatedAtAfter(String phone, Instant since);

    /** Row lock: serializes status changes and edits on the same order (double clicks, two tabs). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from CustomerOrder o where o.id = :id")
    Optional<CustomerOrder> findForUpdate(@Param("id") UUID id);

    @Query("select o.status, count(o) from CustomerOrder o group by o.status")
    List<Object[]> countByStatus();
}