package com.lunelle.backend.products.repository;

import com.lunelle.backend.products.entity.Product;

import jakarta.persistence.LockModeType;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    Optional<Product> findByIdAndActiveTrueAndCategory_ActiveTrue(UUID id);

    @Query(
        value = """
            SELECT p
            FROM Product p
            JOIN p.category c
            WHERE p.active = true
              AND c.active = true
              AND (:categoryId IS NULL OR c.id = :categoryId)
              AND (
                    :search = ''
                    OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(p.description) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            """,
        countQuery = """
            SELECT COUNT(p)
            FROM Product p
            JOIN p.category c
            WHERE p.active = true
              AND c.active = true
              AND (:categoryId IS NULL OR c.id = :categoryId)
              AND (
                    :search = ''
                    OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(p.description) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            """
    )
    Page<Product> findPublicProducts(
        @Param("categoryId") UUID categoryId,
        @Param("search") String search,
        Pageable pageable
    );

    boolean existsBySlug(String slug);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") UUID id);
}