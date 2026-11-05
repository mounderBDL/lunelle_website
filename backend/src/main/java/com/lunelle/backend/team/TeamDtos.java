package com.lunelle.backend.team;

import com.lunelle.backend.admin.AdminRole;
import com.lunelle.backend.admin.AdminUser;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class TeamDtos {

    private TeamDtos() {
    }

    public record MemberDto(UUID id, String name, String email, AdminRole role, boolean active, Instant createdAt) {
        static MemberDto from(AdminUser a) {
            return new MemberDto(a.getId(), a.getName(), a.getEmail(), a.getRole(), a.isActive(), a.getCreatedAt());
        }
    }

    public record CreateMemberRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(min = 8, max = 72) String password) {
    }

    /** password: leave empty to keep the current one; a new one signs the person out everywhere. */
    public record UpdateMemberRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Email @Size(max = 255) String email,
            @Size(max = 72) String password,
            @NotNull Boolean active) {
    }
}
