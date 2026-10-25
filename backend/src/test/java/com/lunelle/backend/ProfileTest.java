package com.lunelle.backend;

import com.lunelle.backend.admin.AdminUser;
import com.lunelle.backend.admin.AdminUserRepository;
import com.lunelle.backend.auth.AuthController;
import com.lunelle.backend.auth.UpdateProfileRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProfileTest extends IntegrationTestBase {

    private static final String PASSWORD = "test-password-1";

    @Autowired
    private AuthController auth;
    @Autowired
    private AdminUserRepository admins;
    @Autowired
    private PasswordEncoder encoder;

    private final List<AdminUser> created = new ArrayList<>();

    @AfterEach
    void removeTestAdmins() {
        admins.deleteAll(created);
        created.clear();
    }

    private AdminUser newAdmin() {
        AdminUser admin = new AdminUser();
        admin.setEmail("profile-" + UUID.randomUUID() + "@test.local");
        admin.setPasswordHash(encoder.encode(PASSWORD));
        admin.setName("Test Admin");
        AdminUser saved = admins.save(admin);
        created.add(saved);
        return saved;
    }

    private static Jwt jwtOf(AdminUser admin) {
        return Jwt.withTokenValue("token").header("alg", "none").subject(admin.getId().toString()).build();
    }

    private static void assertHttp(Throwable t, int expected) {
        assertThat(t).isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode().value()).isEqualTo(expected));
    }

    @Test
    void theNameCanBeChangedWithoutThePassword() {
        AdminUser admin = newAdmin();

        auth.updateProfile(new UpdateProfileRequest("Louli", admin.getEmail(), null), jwtOf(admin));

        AdminUser reloaded = admins.findById(admin.getId()).orElseThrow();
        assertThat(reloaded.getName()).isEqualTo("Louli");
        assertThat(reloaded.getEmail()).isEqualTo(admin.getEmail());
    }

    @Test
    void changingTheEmailNeedsTheCurrentPassword() {
        AdminUser admin = newAdmin();
        String newEmail = "new-" + UUID.randomUUID() + "@test.local";

        assertThatThrownBy(() -> auth.updateProfile(new UpdateProfileRequest("Louli", newEmail, null), jwtOf(admin)))
                .satisfies(t -> assertHttp(t, 400));
        assertThatThrownBy(() -> auth.updateProfile(new UpdateProfileRequest("Louli", newEmail, "wrong-password"), jwtOf(admin)))
                .satisfies(t -> assertHttp(t, 400));
        assertThat(admins.findById(admin.getId()).orElseThrow().getEmail()).isEqualTo(admin.getEmail());

        auth.updateProfile(new UpdateProfileRequest("Louli", newEmail, PASSWORD), jwtOf(admin));
        assertThat(admins.findById(admin.getId()).orElseThrow().getEmail()).isEqualTo(newEmail);
    }

    @Test
    void anEmailUsedByAnotherAdminIsRefused() {
        AdminUser first = newAdmin();
        AdminUser second = newAdmin();

        assertThatThrownBy(() -> auth.updateProfile(
                new UpdateProfileRequest("Louli", first.getEmail().toUpperCase(), PASSWORD), jwtOf(second)))
                .satisfies(t -> assertHttp(t, 409));
    }
}