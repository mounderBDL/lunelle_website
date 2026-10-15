package com.lunelle.backend.delivery.repository;

import com.lunelle.backend.delivery.entity.DeliveryOffice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DeliveryOfficeRepository
        extends JpaRepository<DeliveryOffice, UUID> {

    List<DeliveryOffice> findAllByOrderByWilayaAscCommuneAscNameAsc();

    boolean existsByNameIgnoreCaseAndWilayaIgnoreCaseAndCommuneIgnoreCase(
            String name,
            String wilaya,
            String commune
    );

    boolean existsByWilayaIgnoreCase(String wilaya);
}
