package com.lunelle.backend.packs.service;

import com.lunelle.backend.common.exception.ResourceConflictException;
import com.lunelle.backend.common.exception.ResourceNotFoundException;
import com.lunelle.backend.packs.dto.PackCreateRequest;
import com.lunelle.backend.packs.dto.PackItemCreateRequest;
import com.lunelle.backend.packs.dto.PackItemResponse;
import com.lunelle.backend.packs.dto.PackResponse;
import com.lunelle.backend.packs.dto.PackStatusRequest;
import com.lunelle.backend.packs.dto.PackUpdateRequest;
import com.lunelle.backend.packs.entity.Pack;
import com.lunelle.backend.packs.entity.PackItem;
import com.lunelle.backend.packs.repository.PackItemRepository;
import com.lunelle.backend.packs.repository.PackRepository;
import com.lunelle.backend.products.entity.Product;
import com.lunelle.backend.products.repository.ProductRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class PackService {

    private final PackRepository packRepository;
    private final PackItemRepository packItemRepository;
    private final ProductRepository productRepository;

    public PackService(
        PackRepository packRepository,
        PackItemRepository packItemRepository,
        ProductRepository productRepository
    ) {
        this.packRepository = packRepository;
        this.packItemRepository = packItemRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public PackResponse createPack(PackCreateRequest request) {
        if (packRepository.existsBySlug(request.slug())) {
            throw new ResourceConflictException(
                "A pack with this slug already exists."
            );
        }

        // Prevent duplicate products within the same pack.
        Set<UUID> productIds = new HashSet<>();

        for (PackItemCreateRequest item : request.items()) {
            if (!productIds.add(item.productId())) {
                throw new IllegalArgumentException(
                    "A product can only appear once in a pack. " +
                    "Use its quantity field for multiple units."
                );
            }
        }

        // Validate every component before saving anything.
        List<Product> products = new ArrayList<>();

        for (PackItemCreateRequest item : request.items()) {
            Product product = productRepository
                .findByIdAndActiveTrueAndCategory_ActiveTrue(
                    item.productId()
                )
                .orElseThrow(() ->
                    new ResourceNotFoundException(
                        "An active product was not found: " +
                        item.productId()
                    )
                );

            products.add(product);
        }

        Pack pack = Pack.create(
            request.name().trim(),
            request.slug(),
            request.description(),
            request.price()
        );

        Pack savedPack = packRepository.saveAndFlush(pack);

        List<PackItem> itemsToSave = new ArrayList<>();

        for (int i = 0; i < request.items().size(); i++) {
            PackItemCreateRequest itemRequest = request.items().get(i);
            Product product = products.get(i);

            itemsToSave.add(
                PackItem.create(
                    savedPack,
                    product,
                    itemRequest.quantity()
                )
            );
        }

        List<PackItem> savedItems =
            packItemRepository.saveAllAndFlush(itemsToSave);

        List<PackItemResponse> itemResponses = savedItems.stream()
            .map(item -> new PackItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProduct().getName(),
                item.getQuantity()
            ))
            .toList();

        return new PackResponse(
            savedPack.getId(),
            savedPack.getName(),
            savedPack.getSlug(),
            savedPack.getDescription(),
            savedPack.getPrice(),
            savedPack.isActive(),
            itemResponses
        );
    }

    @Transactional(readOnly = true)
    public List<PackResponse> getAllPacks() {
        List<Pack> packs = packRepository.findAllByOrderByCreatedAtDesc();

        if (packs.isEmpty()) {
            return List.of();
        }

        List<UUID> packIds = packs.stream()
            .map(Pack::getId)
            .toList();

        Map<UUID, List<PackItemResponse>> itemsByPackId =
            packItemRepository.findAllByPack_IdIn(packIds)
                .stream()
                .map(item -> Map.entry(
                    item.getPack().getId(),
                    new PackItemResponse(
                        item.getId(),
                        item.getProduct().getId(),
                        item.getProduct().getName(),
                        item.getQuantity()
                    )
                ))
                .collect(Collectors.groupingBy(
                    Map.Entry::getKey,
                    Collectors.mapping(
                        Map.Entry::getValue,
                        Collectors.toList()
                    )
                ));

        return packs.stream()
            .map(pack -> new PackResponse(
                pack.getId(),
                pack.getName(),
                pack.getSlug(),
                pack.getDescription(),
                pack.getPrice(),
                pack.isActive(),
                itemsByPackId.getOrDefault(pack.getId(), List.of())
            ))
            .toList();
    }

    @Transactional(readOnly = true)
    public PackResponse getPackById(UUID id) {
        Pack pack = packRepository.findById(id)
            .orElseThrow(() ->
                new ResourceNotFoundException("Pack not found")
            );

        List<PackItemResponse> items =
            packItemRepository.findAllByPack_Id(id)
                .stream()
                .map(item -> new PackItemResponse(
                    item.getId(),
                    item.getProduct().getId(),
                    item.getProduct().getName(),
                    item.getQuantity()
                ))
                .toList();

        return new PackResponse(
            pack.getId(),
            pack.getName(),
            pack.getSlug(),
            pack.getDescription(),
            pack.getPrice(),
            pack.isActive(),
            items
        );
    }
    
    @Transactional
    public PackResponse updatePack(UUID id, PackUpdateRequest request) {
        Pack pack = packRepository.findById(id)
            .orElseThrow(() ->
                new ResourceNotFoundException("Pack not found")
            );

        if (request.name() != null && request.name().isBlank()) {
            throw new IllegalArgumentException("Pack name cannot be blank");
        }

        if (request.slug() != null && request.slug().isBlank()) {
            throw new IllegalArgumentException("Pack slug cannot be blank");
        }

        if (request.slug() != null
                && packRepository.existsBySlugAndIdNot(request.slug(), id)) {
            throw new ResourceConflictException("Pack slug already exists");
        }

        pack.updateDetails(
            request.name(),
            request.slug(),
            request.description(),
            request.price(),
            request.active()
        );

        Pack savedPack = packRepository.save(pack);

        List<PackItemResponse> items =
            packItemRepository.findAllByPack_Id(id)
                .stream()
                .map(item -> new PackItemResponse(
                    item.getId(),
                    item.getProduct().getId(),
                    item.getProduct().getName(),
                    item.getQuantity()
                ))
                .toList();

        return new PackResponse(
            savedPack.getId(),
            savedPack.getName(),
            savedPack.getSlug(),
            savedPack.getDescription(),
            savedPack.getPrice(),
            savedPack.isActive(),
            items
        );
    }
  
    @Transactional
    public PackResponse updatePackStatus(
            UUID id,
            PackStatusRequest request) {

        Pack pack = packRepository.findById(id)
            .orElseThrow(() ->
                new ResourceNotFoundException("Pack not found")
            );

        pack.updateDetails(
            null,
            null,
            null,
            null,
            request.active()
        );

        packRepository.save(pack);

        return getPackById(id);
    }

    @Transactional(readOnly = true)
    public List<PackResponse> getPublicPacks() {
        List<Pack> packs =
            packRepository.findAllByActiveTrueOrderByCreatedAtDesc();

        if (packs.isEmpty()) {
            return List.of();
        }

        List<UUID> packIds = packs.stream()
            .map(Pack::getId)
            .toList();

        Map<UUID, List<PackItem>> itemsByPackId =
            packItemRepository.findAllByPack_IdIn(packIds)
                .stream()
                .collect(Collectors.groupingBy(
                    item -> item.getPack().getId()
                ));

        return packs.stream()
            .filter(pack -> {
                List<PackItem> items =
                    itemsByPackId.getOrDefault(pack.getId(), List.of());

                return !items.isEmpty() && items.stream().allMatch(item ->
                    item.getProduct().isActive()
                        && item.getProduct().getCategory().isActive()
                );
            })
            .map(pack -> {
                List<PackItemResponse> items =
                    itemsByPackId.getOrDefault(pack.getId(), List.of())
                        .stream()
                        .map(item -> new PackItemResponse(
                            item.getId(),
                            item.getProduct().getId(),
                            item.getProduct().getName(),
                            item.getQuantity()
                        ))
                        .toList();

                return new PackResponse(
                    pack.getId(),
                    pack.getName(),
                    pack.getSlug(),
                    pack.getDescription(),
                    pack.getPrice(),
                    pack.isActive(),
                    items
                );
            })
            .toList();
    }
    
    @Transactional(readOnly = true)
    public PackResponse getPublicPackById(UUID id) {
        Pack pack = packRepository.findByIdAndActiveTrue(id)
            .orElseThrow(() ->
                new ResourceNotFoundException("Pack not found")
            );

        List<PackItem> packItems =
            packItemRepository.findAllByPack_Id(id);

        if (packItems.isEmpty()) {
            throw new ResourceNotFoundException("Pack not found");
        }

        boolean allProductsAvailable = packItems.stream()
            .allMatch(item ->
                item.getProduct().isActive()
                    && item.getProduct().getCategory().isActive()
            );

        if (!allProductsAvailable) {
            throw new ResourceNotFoundException("Pack not found");
        }

        List<PackItemResponse> items = packItems.stream()
            .map(item -> new PackItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProduct().getName(),
                item.getQuantity()
            ))
            .toList();

        return new PackResponse(
            pack.getId(),
            pack.getName(),
            pack.getSlug(),
            pack.getDescription(),
            pack.getPrice(),
            pack.isActive(),
            items
        );
    }

}