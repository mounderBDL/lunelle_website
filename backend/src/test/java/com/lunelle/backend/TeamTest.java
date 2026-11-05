package com.lunelle.backend;

import com.lunelle.backend.admin.AdminRole;
import com.lunelle.backend.admin.AdminUser;
import com.lunelle.backend.admin.AdminUserRepository;
import com.lunelle.backend.auth.AdminSessionValidator;
import com.lunelle.backend.config.AdminAuthorization;
import com.lunelle.backend.order.OrderAdminDtos.ChangeStatusRequest;
import com.lunelle.backend.order.OrderAdminDtos.OrderDetailDto;
import com.lunelle.backend.order.OrderStatus;
import com.lunelle.backend.team.TeamDtos.CreateMemberRequest;
import com.lunelle.backend.team.TeamDtos.MemberDto;
import com.lunelle.backend.team.TeamDtos.UpdateMemberRequest;
import com.lunelle.backend.order.OrderAdminDtos.UpdateDetailsRequest;
import com.lunelle.backend.team.TeamService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TeamTest extends IntegrationTestBase {

    private static final String PASSWORD = "team-password-1";

    @Autowired
    private TeamService team;
    @Autowired
    private AdminUserRepository admins;
    @Autowired
    private AdminAuthorization authorization;
    @Autowired
    private PasswordEncoder encoder;

    private AdminUser owner;

    @BeforeEach
    void freshTeam() {
        jdbc.sql("delete from admin_user where role = 'STAFF' or email like 'team-owner-%'").update();
        owner = new AdminUser();
        owner.setEmail("team-owner-" + UUID.randomUUID() + "@test.local");
        owner.setPasswordHash(encoder.encode(PASSWORD));
        owner.setName("Owner");
        owner.setRole(AdminRole.OWNER);
        owner = admins.save(owner);
    }

    @AfterEach
    void cleanTeam() {
        jdbc.sql("delete from admin_user where role = 'STAFF' or email like 'team-owner-%'").update();
    }

    private MemberDto addStaff(String name) {
        return team.create(new CreateMemberRequest(name, name.toLowerCase() + "-" + UUID.randomUUID() + "@test.local", PASSWORD));
    }

    private static void assertHttp(Throwable t, int expected) {
        assertThat(t).isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode().value()).isEqualTo(expected));
    }

    private static Jwt jwtOf(UUID id, Instant issuedAt) {
        return Jwt.withTokenValue("t").header("alg", "none").subject(id.toString())
                .issuedAt(issuedAt).expiresAt(issuedAt.plusSeconds(3600)).build();
    }

    private boolean allowed(UUID adminId, String method, String path) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setRequestURI(path);
        JwtAuthenticationToken auth = new JwtAuthenticationToken(jwtOf(adminId, Instant.now()), List.of());
        return authorization.authorize(() -> auth, new RequestAuthorizationContext(request)).isGranted();
    }

    // ───── creating ─────

    @Test
    void newAccountsAreStaffAndCanLogInWithThePassword() {
        MemberDto staff = addStaff("Sara");

        assertThat(staff.role()).isEqualTo(AdminRole.STAFF);
        assertThat(staff.active()).isTrue();
        AdminUser saved = admins.findById(staff.id()).orElseThrow();
        assertThat(encoder.matches(PASSWORD, saved.getPasswordHash())).isTrue();
    }

    @Test
    void aDuplicateEmailIsRefusedEvenWithDifferentCase() {
        MemberDto staff = addStaff("Sara");

        assertThatThrownBy(() -> team.create(new CreateMemberRequest("Other", staff.email().toUpperCase(), PASSWORD)))
                .satisfies(t -> assertHttp(t, 409));
        assertThatThrownBy(() -> team.create(new CreateMemberRequest("Other", owner.getEmail(), PASSWORD)))
                .satisfies(t -> assertHttp(t, 409));
    }

    @Test
    void shortOrTooLongPasswordsAreRefused() {
        assertThatThrownBy(() -> team.create(new CreateMemberRequest("A", "a-" + UUID.randomUUID() + "@test.local", "short")))
                .satisfies(t -> assertHttp(t, 400));
        assertThatThrownBy(() -> team.create(new CreateMemberRequest("A", "b-" + UUID.randomUUID() + "@test.local", "é".repeat(40))))
                .satisfies(t -> assertHttp(t, 400));
    }

    @Test
    void thereIsALimitOfTenStaffAccounts() {
        for (int i = 0; i < TeamService.MAX_STAFF; i++) {
            addStaff("Staff" + i);
        }
        assertThatThrownBy(() -> addStaff("OneTooMany")).satisfies(t -> assertHttp(t, 400));
    }

    // ───── updating and deleting ─────

    @Test
    void updatingChangesNameEmailAndActiveWithoutTouchingThePassword() {
        MemberDto staff = addStaff("Sara");
        String hashBefore = admins.findById(staff.id()).orElseThrow().getPasswordHash();
        String newEmail = "sara-new-" + UUID.randomUUID() + "@test.local";

        MemberDto updated = team.update(staff.id(), new UpdateMemberRequest("Sara B", newEmail, null, false));

        assertThat(updated.name()).isEqualTo("Sara B");
        assertThat(updated.email()).isEqualTo(newEmail);
        assertThat(updated.active()).isFalse();
        AdminUser saved = admins.findById(staff.id()).orElseThrow();
        assertThat(saved.getPasswordHash()).isEqualTo(hashBefore);
        assertThat(saved.getPasswordChangedAt()).isNull();
    }

    @Test
    void resettingThePasswordEndsOlderSessions() {
        MemberDto staff = addStaff("Sara");
        AdminSessionValidator validator = new AdminSessionValidator(admins);
        Instant before = Instant.now().minusSeconds(60);
        assertThat(validator.validate(jwtOf(staff.id(), before)).hasErrors()).isFalse();

        team.update(staff.id(), new UpdateMemberRequest("Sara", staff.email(), "brand-new-password", true));

        AdminUser saved = admins.findById(staff.id()).orElseThrow();
        assertThat(encoder.matches("brand-new-password", saved.getPasswordHash())).isTrue();
        assertThat(validator.validate(jwtOf(staff.id(), before)).hasErrors()).isTrue();
        assertThat(validator.validate(jwtOf(staff.id(), Instant.now().plusSeconds(5))).hasErrors()).isFalse();
    }

    @Test
    void aDeactivatedOrDeletedAccountLosesAccessAtOnce() {
        MemberDto staff = addStaff("Sara");
        AdminSessionValidator validator = new AdminSessionValidator(admins);
        Jwt session = jwtOf(staff.id(), Instant.now());
        assertThat(validator.validate(session).hasErrors()).isFalse();

        team.update(staff.id(), new UpdateMemberRequest("Sara", staff.email(), null, false));
        assertThat(validator.validate(session).hasErrors()).isTrue();
        assertThat(allowed(staff.id(), "GET", "/api/admin/orders")).isFalse();

        team.update(staff.id(), new UpdateMemberRequest("Sara", staff.email(), null, true));
        assertThat(validator.validate(session).hasErrors()).isFalse();

        team.delete(staff.id());
        assertThat(validator.validate(session).hasErrors()).isTrue();
        assertThat(admins.findById(staff.id())).isEmpty();
    }

    @Test
    void theOwnerCannotBeChangedOrDeletedThroughTheTeamScreen() {
        assertThatThrownBy(() -> team.delete(owner.getId())).satisfies(t -> assertHttp(t, 400));
        assertThatThrownBy(() -> team.update(owner.getId(),
                new UpdateMemberRequest("X", owner.getEmail(), null, false))).satisfies(t -> assertHttp(t, 400));
        assertThat(admins.findById(owner.getId()).orElseThrow().isActive()).isTrue();
    }

    @Test
    void unknownAccountsAre404() {
        assertThatThrownBy(() -> team.delete(UUID.randomUUID())).satisfies(t -> assertHttp(t, 404));
    }

    // ───── permissions, end to end through the authorization manager ─────

    @Test
    void theAuthorizationManagerFollowsTheRole() {
        MemberDto staff = addStaff("Sara");

        assertThat(allowed(staff.id(), "GET", "/api/admin/orders")).isTrue();
        assertThat(allowed(staff.id(), "GET", "/api/admin/stats/low-stock")).isTrue();
        assertThat(allowed(staff.id(), "GET", "/api/admin/stats/overview")).isFalse();
        assertThat(allowed(staff.id(), "GET", "/api/admin/team")).isFalse();
        assertThat(allowed(staff.id(), "GET", "/api/admin/products")).isFalse();

        assertThat(allowed(owner.getId(), "GET", "/api/admin/team")).isTrue();
        assertThat(allowed(owner.getId(), "GET", "/api/admin/stats/overview")).isTrue();
        assertThat(allowed(UUID.randomUUID(), "GET", "/api/admin/orders")).isFalse();
    }

    @Test
    void ordersKeepTheirHistoryWhenTheStaffAccountIsDeleted() {
        MemberDto staff = addStaff("Sara");
        UUID category = newCategory();
        UUID variant = variantId(newProduct(category, "Rose", 5000, 2000, 10));
        UUID orderId = orderIdByCode(checkout.place(handToHand("0550123456", variantLine(variant, 1))).order().code());
        adminOrders.updateDetails(orderId, new UpdateDetailsRequest(null, "Blida", null, null));
        adminOrders.changeStatus(orderId, new ChangeStatusRequest(OrderStatus.CONFIRMED, null, null), staff.id());

        team.delete(staff.id());

        assertThat(statusOf(orderId)).isEqualTo("CONFIRMED");
        long byNobody = jdbc.sql("select count(*) from order_status_history where order_id = :id and admin_id is null and to_status = 'CONFIRMED'")
                .param("id", orderId).query(Long.class).single();
        assertThat(byNobody).isEqualTo(1);
    }

    // ───── cost and profit are hidden from staff ─────

    @Test
    void staffOrderDetailsHaveNoCostOrProfit() {
        UUID category = newCategory();
        UUID variant = variantId(newProduct(category, "Rose", 5000, 2000, 10));
        UUID orderId = orderIdByCode(checkout.place(handToHand("0550123457", variantLine(variant, 2))).order().code());

        OrderDetailDto full = adminOrders.get(orderId);
        assertThat(full.cost()).isEqualTo(4000);
        assertThat(full.profit()).isEqualTo(6000);
        assertThat(full.items().get(0).unitCost()).isEqualTo(2000);

        OrderDetailDto safe = full.withoutCosts();
        assertThat(safe.cost()).isNull();
        assertThat(safe.profit()).isNull();
        assertThat(safe.items()).allSatisfy(i -> assertThat(i.unitCost()).isNull());
        assertThat(safe.subtotal()).isEqualTo(full.subtotal());
        assertThat(safe.total()).isEqualTo(full.total());
        assertThat(safe.items().get(0).unitPrice()).isEqualTo(full.items().get(0).unitPrice());
    }
}
