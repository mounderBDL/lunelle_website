package com.lunelle.backend.setting;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SocialLinkRepository extends JpaRepository<SocialLink, UUID> {
    List<SocialLink> findAllByOrderBySortOrderAsc();
}