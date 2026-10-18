package com.lunelle.backend.delivery;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommuneRepository extends JpaRepository<Commune, Integer> {
    List<Commune> findByWilayaIdAndActiveTrueOrderByNameAsc(Integer wilayaId);
}