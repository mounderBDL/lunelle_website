package com.lunelle.backend.catalog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PackRepository extends JpaRepository<Pack, UUID> {
    boolean existsBySlug(String slug);
    Optional<Pack> findBySlug(String slug);
    List<Pack> findAllByOrderBySortOrderAscCreatedAtDesc();
}