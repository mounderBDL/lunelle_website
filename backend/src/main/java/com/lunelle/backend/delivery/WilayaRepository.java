package com.lunelle.backend.delivery;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WilayaRepository extends JpaRepository<Wilaya, Integer> {
    List<Wilaya> findAllByOrderByIdAsc();
    List<Wilaya> findByActiveTrueOrderByIdAsc();
}