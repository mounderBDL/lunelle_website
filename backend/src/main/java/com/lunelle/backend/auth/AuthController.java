package com.lunelle.backend.auth;

import com.lunelle.backend.admin.AdminUser;
import com.lunelle.backend.admin.AdminUserRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.UUID;

@Tag(name = "Admin auth")
@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String COOKIE_PATH = "/api/admin";

    private final AdminUserRepository admins;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Value("${app.cookie.name}")
    private String cookieName;

    @Value("${app.cookie.secure}")
    private boolean cookieSecure;

    private String dummyHash;

    @PostConstruct
    void init() {
        // compared against when the email is unknown, so response time doesn't reveal valid emails
        dummyHash = passwordEncoder.encode("not-a-real-password");
    }

    @PostMapping("/login")
    public AdminDto login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        AdminUser admin = admins.findByEmailIgnoreCase(request.email().trim())
                .filter(AdminUser::isActive)
                .orElse(null);
        String hash = admin != null ? admin.getPasswordHash() : dummyHash;
        boolean passwordOk = passwordEncoder.matches(request.password(), hash);
        if (admin == null || !passwordOk) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        setCookie(response, jwtService.issue(admin), jwtService.ttl());
        return AdminDto.from(admin);
    }

    @PostMapping("/logout")
    public void logout(HttpServletResponse response) {
        setCookie(response, "", Duration.ZERO);
    }

    @GetMapping("/me")
    public AdminDto me(@AuthenticationPrincipal Jwt jwt) {
        return admins.findById(UUID.fromString(jwt.getSubject()))
                .filter(AdminUser::isActive)
                .map(AdminDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private void setCookie(HttpServletResponse response, String value, Duration maxAge) {
        ResponseCookie cookie = ResponseCookie.from(cookieName, value)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path(COOKIE_PATH)
                .maxAge(maxAge)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}