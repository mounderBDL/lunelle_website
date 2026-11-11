package com.lunelle.backend.shipping;

import com.lunelle.backend.admin.AdminAccess;
import com.lunelle.backend.order.OrderAdminDtos.OrderDetailDto;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Open to the owner and to team members, like the rest of order handling (see StaffPolicy). */
@Tag(name = "Shipping (admin)")
@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
public class AdminShippingController {

    private final ShippingService shipping;
    private final AdminAccess access;

    /** Creates the Yalidine parcel for a confirmed order and marks the order shipped. */
    @PostMapping("/{id}/yalidine")
    public OrderDetailDto send(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        OrderDetailDto dto = shipping.sendToYalidine(id, UUID.fromString(jwt.getSubject()));
        return access.isOwner(jwt) ? dto : dto.withoutCosts();
    }
}
