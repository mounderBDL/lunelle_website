package com.lunelle.backend.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface VariantRepository extends JpaRepository<ProductVariant, UUID> {

    /** Atomic: succeeds only if the resulting stock stays >= 0. Returns rows updated (0 or 1). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update ProductVariant v set v.stock = v.stock + :delta "
            + "where v.id = :id and v.stock + :delta >= 0")
    int adjustStock(@Param("id") UUID id, @Param("delta") int delta);

    @Query("select v.stock from ProductVariant v where v.id = :id")
    Integer findStock(@Param("id") UUID id);
}