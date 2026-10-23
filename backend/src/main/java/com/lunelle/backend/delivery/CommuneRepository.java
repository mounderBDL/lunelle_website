package com.lunelle.backend.delivery;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CommuneRepository extends JpaRepository<Commune, Integer> {
    List<Commune> findByWilayaIdAndActiveTrueOrderByNameAsc(Integer wilayaId);

    List<Commune> findByWilayaIdAndActiveTrueAndHasOfficeTrueOrderByNameAsc(Integer wilayaId);

    List<Commune> findByWilayaIdOrderByNameAsc(Integer wilayaId);

    List<Commune> findAllByOrderByWilayaIdAscNameAsc();

    @Query("select c.wilayaId, count(c) from Commune c where c.active = true and c.hasOffice = true group by c.wilayaId")
    List<Object[]> countOfficesByWilaya();
}