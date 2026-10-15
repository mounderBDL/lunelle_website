package com.lunelle.backend.delivery.service;

import com.lunelle.backend.common.exception.ResourceConflictException;
import com.lunelle.backend.common.exception.ResourceNotFoundException;
import com.lunelle.backend.delivery.dto.DeliveryZoneCreateRequest;
import com.lunelle.backend.delivery.dto.DeliveryZoneUpdateRequest;
import com.lunelle.backend.delivery.entity.DeliveryZone;
import com.lunelle.backend.delivery.repository.DeliveryZoneRepository;
import com.lunelle.backend.delivery.repository.DeliveryOfficeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;
import java.util.List;

@Service
public class DeliveryZoneService {

    private final DeliveryZoneRepository deliveryZoneRepository;
    private final DeliveryOfficeRepository deliveryOfficeRepository;

    public DeliveryZoneService(
            DeliveryZoneRepository deliveryZoneRepository, 
            DeliveryOfficeRepository deliveryOfficeRepository) {
        this.deliveryZoneRepository = deliveryZoneRepository;
        this.deliveryOfficeRepository = deliveryOfficeRepository;
    }

    @Transactional(readOnly = true)
    public List<DeliveryZone> getAllDeliveryZones() {
        return deliveryZoneRepository.findAllByOrderByWilayaAsc();
    }
        @Transactional
    public DeliveryZone createDeliveryZone(DeliveryZoneCreateRequest request) {
        String wilaya = request.wilaya().trim();

        if (deliveryZoneRepository.existsByWilayaIgnoreCase(wilaya)) {
            throw new ResourceConflictException(
                    "A delivery zone for this Wilaya already exists"
            );
        }

        DeliveryZone zone = DeliveryZone.create(
                wilaya,
                request.homeDeliveryFee(),
                request.officeDeliveryFee()
        );

        return deliveryZoneRepository.save(zone);
    }

    @Transactional
    public DeliveryZone updateDeliveryZone(
            UUID id,
            DeliveryZoneUpdateRequest request) {

        if (request.homeDeliveryFee() == null
                && request.officeDeliveryFee() == null) {
            throw new IllegalArgumentException(
                    "At least one delivery fee must be provided"
            );
        }

        DeliveryZone zone = deliveryZoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Delivery zone not found"
                ));

        zone.updateFees(
                request.homeDeliveryFee(),
                request.officeDeliveryFee()
        );

        return deliveryZoneRepository.save(zone);
    }

    @Transactional
    public void deleteDeliveryZone(UUID id) {
        DeliveryZone zone = deliveryZoneRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Delivery zone not found"
                        )
                );

        if (deliveryOfficeRepository.existsByWilayaIgnoreCase(
                zone.getWilaya())) {
            throw new ResourceConflictException(
                    "Cannot delete this delivery zone while delivery offices exist for its Wilaya"
            );
        }

        deliveryZoneRepository.delete(zone);
    }
}
