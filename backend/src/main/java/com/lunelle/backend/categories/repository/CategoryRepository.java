package com.lunelle.backend.categories.repository;

import com.lunelle.backend.categories.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

    // Public storefront: only active categories.
    List<Category> findAllByActiveTrueOrderByNameAsc();

    // Admin dashboard: all categories, active and inactive.
    List<Category> findAllByOrderByNameAsc();

    boolean existsByNameIgnoreCase(String name);

    boolean existsBySlug(String slug);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);

    boolean existsBySlugAndIdNot(String slug, UUID id);
}