package com.lunelle.backend.catalog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    boolean existsBySlug(String slug);
    List<Category> findAllByOrderBySortOrderAscNameEnAsc();
    List<Category> findByActiveTrueOrderBySortOrderAscNameEnAsc();
}