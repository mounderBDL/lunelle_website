package com.lunelle.backend.config;

import com.lunelle.backend.admin.AdminRole;
import com.lunelle.backend.admin.AdminUser;
import com.lunelle.backend.admin.AdminUserRepository;
import com.lunelle.backend.admin.StaffPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.function.Supplier;

/** Every /api/admin request: signed in, account still active, and the role allows this endpoint. */
@Component
@RequiredArgsConstructor
public class AdminAuthorization implements AuthorizationManager<RequestAuthorizationContext> {

    private final AdminUserRepository admins;

    @Override
    public AuthorizationDecision authorize(Supplier<? extends Authentication> authentication,
                                           RequestAuthorizationContext context) {
        if (!(authentication.get() instanceof JwtAuthenticationToken token) || !token.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }
        AdminUser admin;
        try {
            admin = admins.findById(UUID.fromString(token.getToken().getSubject())).orElse(null);
        } catch (IllegalArgumentException e) {
            return new AuthorizationDecision(false);
        }
        if (admin == null || !admin.isActive()) {
            return new AuthorizationDecision(false);
        }
        if (admin.getRole() == AdminRole.OWNER) {
            return new AuthorizationDecision(true);
        }
        var request = context.getRequest();
        return new AuthorizationDecision(StaffPolicy.allows(request.getMethod(), request.getRequestURI()));
    }
}
