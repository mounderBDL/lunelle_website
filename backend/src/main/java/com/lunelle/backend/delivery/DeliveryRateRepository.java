package com.lunelle.backend.delivery;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DeliveryRateRepository extends JpaRepository<DeliveryRate, Integer> {
    Optional<DeliveryRate> findByWilayaIdAndMethod(Integer wilayaId, DeliveryMethod method);
}