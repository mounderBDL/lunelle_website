package com.lunelle.backend.catalog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {
    boolean existsBySlug(String slug);
    boolean existsByCategoryId(UUID categoryId);
    Optional<Product> findBySlug(String slug);
    List<Product> findAllByOrderBySortOrderAscCreatedAtDesc();
}