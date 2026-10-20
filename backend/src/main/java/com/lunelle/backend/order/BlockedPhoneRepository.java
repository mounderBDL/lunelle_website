package com.lunelle.backend.order;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BlockedPhoneRepository extends JpaRepository<BlockedPhone, String> {
}