package com.lunelle.backend.team;

import com.lunelle.backend.admin.AdminRole;
import com.lunelle.backend.admin.AdminUser;
import com.lunelle.backend.admin.AdminUserRepository;
import com.lunelle.backend.team.TeamDtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TeamService {

    public static final int MAX_STAFF = 10;
    private static final int MIN_PASSWORD = 8;
    private static final int BCRYPT_MAX_BYTES = 72;

    private final AdminUserRepository admins;
    private final PasswordEncoder encoder;

    @Transactional(readOnly = true)
    public List<MemberDto> list() {
        return admins.findAllByOrderByCreatedAtAsc().stream().map(MemberDto::from).toList();
    }

    @Transactional
    public MemberDto create(CreateMemberRequest r) {
        if (admins.countByRole(AdminRole.STAFF) >= MAX_STAFF) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "You can have at most " + MAX_STAFF + " team accounts");
        }
        String email = r.email().trim();
        checkEmailFree(email, null);
        checkPassword(r.password());

        AdminUser staff = new AdminUser();
        staff.setName(r.name().trim());
        staff.setEmail(email);
        staff.setPasswordHash(encoder.encode(r.password()));
        staff.setRole(AdminRole.STAFF);
        return MemberDto.from(admins.save(staff));
    }

    @Transactional
    public MemberDto update(UUID id, UpdateMemberRequest r) {
        AdminUser staff = staffMember(id);
        String email = r.email().trim();
        if (!email.equalsIgnoreCase(staff.getEmail())) {
            checkEmailFree(email, id);
            staff.setEmail(email);
        }
        staff.setName(r.name().trim());
        staff.setActive(r.active());
        if (r.password() != null && !r.password().isBlank()) {
            checkPassword(r.password());
            staff.setPasswordHash(encoder.encode(r.password()));
            staff.setPasswordChangedAt(Instant.now()); // every older session is rejected
        }
        return MemberDto.from(admins.save(staff));
    }

    /** Order history and stock movements stay (the "by" becomes empty). */
    @Transactional
    public void delete(UUID id) {
        admins.delete(staffMember(id));
    }

    /** The owner account can never be changed or deleted through the team screen. */
    private AdminUser staffMember(UUID id) {
        AdminUser admin = admins.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team account not found"));
        if (admin.getRole() != AdminRole.STAFF) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The owner account can't be changed here");
        }
        return admin;
    }

    private void checkEmailFree(String email, UUID except) {
        admins.findByEmailIgnoreCase(email)
                .filter(other -> !other.getId().equals(except))
                .ifPresent(other -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "This email is already used");
                });
    }

    private static void checkPassword(String password) {
        if (password.length() < MIN_PASSWORD) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "The password must have at least " + MIN_PASSWORD + " characters");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The password is too long");
        }
    }
}
