package com.lunelle.backend.delivery.repository;

import com.lunelle.backend.delivery.entity.DeliveryZone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeliveryZoneRepository
        extends JpaRepository<DeliveryZone, UUID> {

    List<DeliveryZone> findAllByOrderByWilayaAsc();

     boolean existsByWilayaIgnoreCase(String wilaya);

     Optional<DeliveryZone> findByWilayaIgnoreCase(String wilaya);

}
