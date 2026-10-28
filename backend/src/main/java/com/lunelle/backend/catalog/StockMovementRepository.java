package com.lunelle.backend.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {
    List<StockMovement> findTop100ByVariantIdOrderByCreatedAtDesc(UUID variantId);

    /** How many units of each size were already put back in stock for this order. */
    @Query("select m.variantId, coalesce(sum(m.delta), 0) from StockMovement m "
            + "where m.orderId = :orderId and m.reason = :reason group by m.variantId")
    List<Object[]> restockedByVariant(@Param("orderId") UUID orderId, @Param("reason") StockReason reason);
}