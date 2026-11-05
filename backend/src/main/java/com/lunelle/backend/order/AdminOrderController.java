package com.lunelle.backend.order;

import com.lunelle.backend.admin.AdminAccess;
import com.lunelle.backend.delivery.DeliveryMethod;
import com.lunelle.backend.order.OrderAdminDtos.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Orders (admin)")
@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
public class AdminOrderController {

    private final OrderAdminService service;
    private final AdminAccess access;

    @GetMapping
    public PageDto<OrderListItemDto> list(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer wilayaId,
            @RequestParam(required = false) DeliveryMethod deliveryMethod,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.list(status, q, wilayaId, deliveryMethod, from, to, page, size);
    }

    /** Order counts per status (for the tabs / "new orders" badge). */
    @GetMapping("/counts")
    public Map<OrderStatus, Long> counts() {
        return service.counts();
    }

    @GetMapping("/{id}")
    public OrderDetailDto get(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return shape(service.get(id), jwt);
    }

    /** Only while the order is NEW. Send the complete list of items the order should contain. */
    @PutMapping("/{id}")
    public OrderDetailDto edit(@PathVariable UUID id, @Valid @RequestBody EditOrderRequest request,
                               @AuthenticationPrincipal Jwt jwt) {
        return shape(service.edit(id, request, adminId(jwt)), jwt);
    }

    @PostMapping("/{id}/status")
    public OrderDetailDto changeStatus(@PathVariable UUID id, @Valid @RequestBody ChangeStatusRequest request,
                                       @AuthenticationPrincipal Jwt jwt) {
        return shape(service.changeStatus(id, request, adminId(jwt)), jwt);
    }

    @PutMapping("/{id}/details")
    public OrderDetailDto details(@PathVariable UUID id, @Valid @RequestBody UpdateDetailsRequest request,
                                  @AuthenticationPrincipal Jwt jwt) {
        return shape(service.updateDetails(id, request), jwt);
    }

    /** Cost and profit are for the owner only. */
    private OrderDetailDto shape(OrderDetailDto dto, Jwt jwt) {
        return access.isOwner(jwt) ? dto : dto.withoutCosts();
    }

    private static UUID adminId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }

    /** Puts bottles of a RETURNED order back in stock, after the admin has checked them. */
    @PostMapping("/{id}/restock")
    public OrderDetailDto restock(@PathVariable UUID id, @Valid @RequestBody RestockRequest request,
                                  @AuthenticationPrincipal Jwt jwt) {
        return shape(service.restockReturned(id, request, adminId(jwt)), jwt);
    }
}