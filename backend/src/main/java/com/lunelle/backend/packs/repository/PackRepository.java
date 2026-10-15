package com.lunelle.backend.packs.repository;

import com.lunelle.backend.packs.entity.Pack;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PackRepository extends JpaRepository<Pack, UUID> {

    boolean existsBySlug(String slug);

    List<Pack> findAllByOrderByCreatedAtDesc();

    boolean existsBySlugAndIdNot(String slug, UUID id);

    List<Pack> findAllByActiveTrueOrderByCreatedAtDesc();

    Optional<Pack> findByIdAndActiveTrue(UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Pack p WHERE p.id = :id")
    Optional<Pack> findByIdForUpdate(@Param("id") UUID id);
}