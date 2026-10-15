
package com.lunelle.backend.delivery.service;

import com.lunelle.backend.common.exception.ResourceConflictException;
import com.lunelle.backend.common.exception.ResourceNotFoundException;
import com.lunelle.backend.delivery.dto.DeliveryOfficeCreateRequest;
import com.lunelle.backend.delivery.dto.DeliveryOfficeUpdateRequest;
import com.lunelle.backend.delivery.entity.DeliveryOffice;
import com.lunelle.backend.delivery.entity.DeliveryZone;
import com.lunelle.backend.delivery.repository.DeliveryOfficeRepository;
import com.lunelle.backend.delivery.repository.DeliveryZoneRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class DeliveryOfficeService {

    private final DeliveryOfficeRepository deliveryOfficeRepository;
    private final DeliveryZoneRepository deliveryZoneRepository;

    public DeliveryOfficeService(
            DeliveryOfficeRepository deliveryOfficeRepository,
            DeliveryZoneRepository deliveryZoneRepository) {
        this.deliveryOfficeRepository = deliveryOfficeRepository;
        this.deliveryZoneRepository = deliveryZoneRepository;
    }

    @Transactional(readOnly = true)
    public List<DeliveryOffice> getAllDeliveryOffices() {
        return deliveryOfficeRepository
                .findAllByOrderByWilayaAscCommuneAscNameAsc();
    }

    @Transactional
    public DeliveryOffice createDeliveryOffice(
            DeliveryOfficeCreateRequest request) {

        String name = request.name().trim();
        String submittedWilaya = request.wilaya().trim();
        String commune = request.commune().trim();

        DeliveryZone zone = deliveryZoneRepository
                .findByWilayaIgnoreCase(submittedWilaya)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No delivery zone is configured for this Wilaya"
                ));

        String wilaya = zone.getWilaya();

        if (deliveryOfficeRepository
                .existsByNameIgnoreCaseAndWilayaIgnoreCaseAndCommuneIgnoreCase(
                        name, wilaya, commune)) {
            throw new ResourceConflictException(
                    "A delivery office with these details already exists"
            );
        }

        DeliveryOffice office = DeliveryOffice.create(
                name,
                wilaya,
                commune
        );

        try {
            return deliveryOfficeRepository.saveAndFlush(office);
        } catch (DataIntegrityViolationException exception) {
            throw new ResourceConflictException(
                    "A delivery office with these details already exists"
            );
        }
    }
    @Transactional
    public DeliveryOffice updateDeliveryOffice(
            UUID id,
            DeliveryOfficeUpdateRequest request
    ) {
        if (request.name() == null
                && request.wilaya() == null
                && request.commune() == null) {
            throw new IllegalArgumentException(
                    "At least one field must be provided"
            );
        }

        DeliveryOffice office = deliveryOfficeRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Delivery office not found"
                        )
                );

        String name = request.name() == null
                ? office.getName()
                : request.name().trim();

        String submittedWilaya = request.wilaya() == null
                ? office.getWilaya()
                : request.wilaya().trim();

        String commune = request.commune() == null
                ? office.getCommune()
                : request.commune().trim();

        if (name.isBlank() || submittedWilaya.isBlank()
                || commune.isBlank()) {
            throw new IllegalArgumentException(
                    "Name, Wilaya, and commune must not be blank"
            );
        }

        DeliveryZone zone = deliveryZoneRepository
                .findByWilayaIgnoreCase(submittedWilaya)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "No delivery zone is configured for this Wilaya"
                        )
                );

        String wilaya = zone.getWilaya();

        boolean duplicate =
                deliveryOfficeRepository
                        .existsByNameIgnoreCaseAndWilayaIgnoreCaseAndCommuneIgnoreCase(
                                name, wilaya, commune
                        );

        if (duplicate && (
                !office.getName().equalsIgnoreCase(name)
                || !office.getWilaya().equalsIgnoreCase(wilaya)
                || !office.getCommune().equalsIgnoreCase(commune)
        )) {
            throw new ResourceConflictException(
                    "A delivery office with these details already exists"
            );
        }

        office.updateDetails(name, wilaya, commune);

        try {
            return deliveryOfficeRepository.saveAndFlush(office);
        } catch (DataIntegrityViolationException exception) {
            throw new ResourceConflictException(
                    "A delivery office with these details already exists"
            );
        }
    }
    
    @Transactional
    public void deleteDeliveryOffice(UUID id) {
        DeliveryOffice office = deliveryOfficeRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Delivery office not found"
                        )
                );

        deliveryOfficeRepository.delete(office);
    }
}
