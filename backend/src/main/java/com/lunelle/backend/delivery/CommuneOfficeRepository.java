package com.lunelle.backend.delivery;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommuneOfficeRepository extends JpaRepository<CommuneOffice, Integer> {
    List<CommuneOffice> findByCommuneIdOrderByNameAsc(Integer communeId);
}
