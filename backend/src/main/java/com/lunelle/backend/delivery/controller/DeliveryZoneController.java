package com.lunelle.backend.delivery.controller;

import com.lunelle.backend.common.response.ApiResponse;
import com.lunelle.backend.delivery.dto.DeliveryZoneCreateRequest;
import com.lunelle.backend.delivery.dto.DeliveryZoneResponse;
import com.lunelle.backend.delivery.dto.DeliveryZoneUpdateRequest;
import com.lunelle.backend.delivery.entity.DeliveryZone;
import com.lunelle.backend.delivery.service.DeliveryZoneService;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/delivery-zones")
public class DeliveryZoneController {

    private final DeliveryZoneService deliveryZoneService;

    public DeliveryZoneController(
            DeliveryZoneService deliveryZoneService) {
        this.deliveryZoneService = deliveryZoneService;
    }

    @GetMapping
    public ApiResponse<List<DeliveryZoneResponse>> getAllDeliveryZones() {
        List<DeliveryZoneResponse> zones = deliveryZoneService
                .getAllDeliveryZones()
                .stream()
                .map(this::toResponse)
                .toList();

        return new ApiResponse<>(zones);
    }

    private DeliveryZoneResponse toResponse(DeliveryZone zone) {
        return new DeliveryZoneResponse(
                zone.getId(),
                zone.getWilaya(),
                zone.getHomeDeliveryFee(),
                zone.getOfficeDeliveryFee()
        );
    }

    
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<DeliveryZoneResponse> createDeliveryZone(
            @Valid @RequestBody DeliveryZoneCreateRequest request) {

        DeliveryZone zone = deliveryZoneService.createDeliveryZone(request);

        return new ApiResponse<>(toResponse(zone));
    }

    @PatchMapping("/{id}")
    public ApiResponse<DeliveryZoneResponse> updateDeliveryZone(
            @PathVariable UUID id,
            @Valid @RequestBody DeliveryZoneUpdateRequest request) {

        DeliveryZone zone = deliveryZoneService.updateDeliveryZone(id, request);

        return new ApiResponse<>(toResponse(zone));
    }

    @GetMapping("/../delivery-zones")
    public ApiResponse<List<DeliveryZoneResponse>> getPublicDeliveryZones() {
        List<DeliveryZoneResponse> zones = deliveryZoneService
                .getAllDeliveryZones()
                .stream()
                .map(this::toResponse)
                .toList();

        return new ApiResponse<>(zones);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDeliveryZone(
            @PathVariable UUID id
    ) {
        deliveryZoneService.deleteDeliveryZone(id);
        return ResponseEntity.noContent().build();
    }
}
