package com.lunelle.backend.delivery.controller;

import com.lunelle.backend.common.response.ApiResponse;
import com.lunelle.backend.delivery.dto.DeliveryOfficeResponse;
import com.lunelle.backend.delivery.entity.DeliveryOffice;
import com.lunelle.backend.delivery.service.DeliveryOfficeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/delivery-offices")
public class PublicDeliveryOfficeController {

    private final DeliveryOfficeService deliveryOfficeService;

    public PublicDeliveryOfficeController(
            DeliveryOfficeService deliveryOfficeService
    ) {
        this.deliveryOfficeService = deliveryOfficeService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<DeliveryOfficeResponse>>> getDeliveryOffices() {
        List<DeliveryOfficeResponse> offices =
                deliveryOfficeService.getAllDeliveryOffices()
                        .stream()
                        .map(this::toResponse)
                        .toList();

        return ResponseEntity.ok(new ApiResponse<>(offices));
    }

    private DeliveryOfficeResponse toResponse(DeliveryOffice office) {
        return new DeliveryOfficeResponse(
                office.getId(),
                office.getName(),
                office.getWilaya(),
                office.getCommune()
        );
    }
}