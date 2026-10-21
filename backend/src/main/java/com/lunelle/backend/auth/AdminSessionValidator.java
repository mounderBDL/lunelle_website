package com.lunelle.backend.auth;

import com.lunelle.backend.admin.AdminUser;
import com.lunelle.backend.admin.AdminUserRepository;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/** A valid signature is not enough: the admin must still exist, be active, and not have changed the password since. */
public class AdminSessionValidator implements OAuth2TokenValidator<Jwt> {

    private final AdminUserRepository admins;

    public AdminSessionValidator(AdminUserRepository admins) {
        this.admins = admins;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        try {
            AdminUser admin = admins.findById(UUID.fromString(jwt.getSubject())).orElse(null);
            if (admin != null && admin.isActive()) {
                Instant changed = admin.getPasswordChangedAt();
                Instant issued = jwt.getIssuedAt();
                // token timestamps have second precision
                if (changed == null || (issued != null && !issued.isBefore(changed.truncatedTo(ChronoUnit.SECONDS)))) {
                    return OAuth2TokenValidatorResult.success();
                }
            }
        } catch (IllegalArgumentException ignored) {
            // malformed subject: fall through to failure
        }
        return OAuth2TokenValidatorResult.failure(
                new OAuth2Error("invalid_token", "The admin session is no longer valid", null));
    }
}