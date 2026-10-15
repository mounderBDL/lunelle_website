package com.lunelle.backend.delivery.controller;

import com.lunelle.backend.common.response.ApiResponse;
import com.lunelle.backend.delivery.dto.DeliveryOfficeCreateRequest;
import com.lunelle.backend.delivery.dto.DeliveryOfficeResponse;
import com.lunelle.backend.delivery.dto.DeliveryOfficeUpdateRequest;
import com.lunelle.backend.delivery.entity.DeliveryOffice;
import com.lunelle.backend.delivery.service.DeliveryOfficeService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/delivery-offices")
public class DeliveryOfficeController {

    private final DeliveryOfficeService deliveryOfficeService;

    public DeliveryOfficeController(
            DeliveryOfficeService deliveryOfficeService) {
        this.deliveryOfficeService = deliveryOfficeService;
    }

    @GetMapping
    public ApiResponse<List<DeliveryOfficeResponse>> getAllDeliveryOffices() {
        List<DeliveryOfficeResponse> offices = deliveryOfficeService
                .getAllDeliveryOffices()
                .stream()
                .map(this::toResponse)
                .toList();

        return new ApiResponse<>(offices);
    }
    
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<DeliveryOfficeResponse> createDeliveryOffice(
            @Valid @RequestBody DeliveryOfficeCreateRequest request) {

        DeliveryOffice office =
                deliveryOfficeService.createDeliveryOffice(request);

        return new ApiResponse<>(toResponse(office));
    }

    private DeliveryOfficeResponse toResponse(DeliveryOffice office) {
        return new DeliveryOfficeResponse(
                office.getId(),
                office.getName(),
                office.getWilaya(),
                office.getCommune()
        );
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<DeliveryOfficeResponse>> updateDeliveryOffice(
            @PathVariable UUID id,
            @Valid @RequestBody DeliveryOfficeUpdateRequest request
    ) {
        DeliveryOffice office =
                deliveryOfficeService.updateDeliveryOffice(id, request);

        return ResponseEntity.ok(
                new ApiResponse<>(toResponse(office))
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDeliveryOffice(
            @PathVariable UUID id
    ) {
        deliveryOfficeService.deleteDeliveryOffice(id);
        return ResponseEntity.noContent().build();
    }
}
