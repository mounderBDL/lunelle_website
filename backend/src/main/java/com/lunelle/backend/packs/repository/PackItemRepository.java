package com.lunelle.backend.packs.repository;

import com.lunelle.backend.packs.entity.PackItem;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PackItemRepository
    extends JpaRepository<PackItem, UUID> {

    List<PackItem> findAllByPack_Id(UUID packId);

    @EntityGraph(attributePaths = "product")
    List<PackItem> findAllByPack_IdIn(Collection<UUID> packIds);
}