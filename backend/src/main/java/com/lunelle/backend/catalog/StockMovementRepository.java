package com.lunelle.backend.catalog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {
    List<StockMovement> findTop100ByVariantIdOrderByCreatedAtDesc(UUID variantId);
}