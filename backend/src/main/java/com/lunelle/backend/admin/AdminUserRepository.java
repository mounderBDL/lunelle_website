package com.lunelle.backend.admin;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AdminUserRepository extends JpaRepository<AdminUser, UUID> {
    Optional<AdminUser> findByEmailIgnoreCase(String email);
    boolean existsByEmail(String email);
    long countByRole(AdminRole role);
    long countByRoleAndActiveTrue(AdminRole role);
    java.util.List<AdminUser> findAllByOrderByCreatedAtAsc();
}