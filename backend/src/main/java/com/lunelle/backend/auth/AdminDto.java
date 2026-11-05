package com.lunelle.backend.auth;

import com.lunelle.backend.admin.AdminRole;
import com.lunelle.backend.admin.AdminUser;

import java.util.UUID;

public record AdminDto(UUID id, String email, String name, AdminRole role) {
    public static AdminDto from(AdminUser admin) {
        return new AdminDto(admin.getId(), admin.getEmail(), admin.getName(), admin.getRole());
    }
}
