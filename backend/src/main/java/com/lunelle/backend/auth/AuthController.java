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

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Tag(name = "Admin auth")
@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String COOKIE_PATH = "/api/admin";
    private static final int BCRYPT_MAX_BYTES = 72;

    private final AdminUserRepository admins;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginAttemptService attempts;

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
        String key = request.email().trim().toLowerCase(Locale.ROOT);
        attempts.assertAllowed(key);

        AdminUser admin = admins.findByEmailIgnoreCase(request.email().trim())
                .filter(AdminUser::isActive)
                .orElse(null);
        String hash = admin != null ? admin.getPasswordHash() : dummyHash;
        boolean passwordOk = fitsBcrypt(request.password()) && passwordEncoder.matches(request.password(), hash);
        if (admin == null || !passwordOk) {
            attempts.recordFailure(key);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        attempts.reset(key);
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

    /** Changes the password, invalidates every older session, and keeps this one logged in. */
    @PostMapping("/change-password")
    public AdminDto changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                   @AuthenticationPrincipal Jwt jwt, HttpServletResponse response) {
        UUID id = UUID.fromString(jwt.getSubject());
        String key = "pw:" + id;
        attempts.assertAllowed(key);

        AdminUser admin = admins.findById(id)
                .filter(AdminUser::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (!fitsBcrypt(request.currentPassword())
                || !passwordEncoder.matches(request.currentPassword(), admin.getPasswordHash())) {
            attempts.recordFailure(key);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The current password is incorrect");
        }
        if (!fitsBcrypt(request.newPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The new password is too long");
        }
        if (request.newPassword().equals(request.currentPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The new password must be different");
        }
        attempts.reset(key);

        admin.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        admin.setPasswordChangedAt(Instant.now());
        admins.save(admin);
        setCookie(response, jwtService.issue(admin), jwtService.ttl());
        return AdminDto.from(admin);
    }

    /** name, and login email. Changing the email needs the current password. */
    @PutMapping("/profile")
    public AdminDto updateProfile(@Valid @RequestBody UpdateProfileRequest request, @AuthenticationPrincipal Jwt jwt) {
        UUID id = UUID.fromString(jwt.getSubject());
        AdminUser admin = admins.findById(id)
                .filter(AdminUser::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        String email = request.email().trim();
        if (!email.equalsIgnoreCase(admin.getEmail())) {
            String key = "pw:" + id;
            attempts.assertAllowed(key);
            String current = request.currentPassword();
            if (current == null || !fitsBcrypt(current)
                    || !passwordEncoder.matches(current, admin.getPasswordHash())) {
                attempts.recordFailure(key);
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The current password is incorrect");
            }
            attempts.reset(key);
            admins.findByEmailIgnoreCase(email)
                    .filter(other -> !other.getId().equals(id))
                    .ifPresent(other -> {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "This email is already used");
                    });
            admin.setEmail(email);
        }
        admin.setName(request.name().trim());
        admins.save(admin);
        return AdminDto.from(admin);
    }    

    private static boolean fitsBcrypt(String password) {
        return password.getBytes(StandardCharsets.UTF_8).length <= BCRYPT_MAX_BYTES;
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