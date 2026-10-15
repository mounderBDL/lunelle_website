package com.lunelle.backend.delivery.controller;

import com.lunelle.backend.common.response.ApiResponse;
import com.lunelle.backend.delivery.dto.DeliveryZoneResponse;
import com.lunelle.backend.delivery.service.DeliveryZoneService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/delivery-zones")
public class PublicDeliveryZoneController {

    private final DeliveryZoneService deliveryZoneService;

    public PublicDeliveryZoneController(
            DeliveryZoneService deliveryZoneService) {
        this.deliveryZoneService = deliveryZoneService;
    }

    @GetMapping
    public ApiResponse<List<DeliveryZoneResponse>> getPublicDeliveryZones() {
        List<DeliveryZoneResponse> zones = deliveryZoneService
                .getAllDeliveryZones()
                .stream()
                .map(zone -> new DeliveryZoneResponse(
                        zone.getId(),
                        zone.getWilaya(),
                        zone.getHomeDeliveryFee(),
                        zone.getOfficeDeliveryFee()
                ))
                .toList();

        return new ApiResponse<>(zones);
    }
}
