package com.lunelle.backend.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** The role is read from the database on every call, so a change applies immediately. */
@Component
@RequiredArgsConstructor
public class AdminAccess {

    private final AdminUserRepository admins;

    public boolean isOwner(Jwt jwt) {
        return admins.findById(UUID.fromString(jwt.getSubject()))
                .map(a -> a.isActive() && a.getRole() == AdminRole.OWNER)
                .orElse(false);
    }
}
