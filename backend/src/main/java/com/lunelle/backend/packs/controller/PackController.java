package com.lunelle.backend.packs.controller;

import com.lunelle.backend.common.response.ApiResponse;
import com.lunelle.backend.packs.dto.PackCreateRequest;
import com.lunelle.backend.packs.dto.PackResponse;
import com.lunelle.backend.packs.dto.PackStatusRequest;
import com.lunelle.backend.packs.dto.PackUpdateRequest;
import com.lunelle.backend.packs.service.PackService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class PackController {

    private final PackService packService;

    public PackController(PackService packService) {
        this.packService = packService;
    }

    @PostMapping("/admin/packs")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PackResponse> createPack(
        @Valid @RequestBody PackCreateRequest request
    ) {
        return new ApiResponse<>(
            packService.createPack(request)
        );
    }

    @GetMapping("/admin/packs")
    public ApiResponse<List<PackResponse>> getAllPacks() {
        return new ApiResponse<>(packService.getAllPacks());
    }

    @GetMapping("/admin/packs/{id}")
    public ApiResponse<PackResponse> getPackById(
            @PathVariable UUID id) {
        return new ApiResponse<>(packService.getPackById(id));
    }

    @PatchMapping("/admin/packs/{id}")
    public ApiResponse<PackResponse> updatePack(
            @PathVariable UUID id,
            @Valid @RequestBody PackUpdateRequest request) {
        return new ApiResponse<>(packService.updatePack(id, request));
    }

    @PatchMapping("/admin/packs/{id}/status")
    public ApiResponse<PackResponse> updatePackStatus(
            @PathVariable UUID id,
            @Valid @RequestBody PackStatusRequest request) {
        return new ApiResponse<>(
            packService.updatePackStatus(id, request)
        );
    }

    @GetMapping("/packs")
    public ApiResponse<List<PackResponse>> getPublicPacks() {
        return new ApiResponse<>(packService.getPublicPacks());
    }

    @GetMapping("/packs/{id}")
    public ApiResponse<PackResponse> getPublicPackById(
            @PathVariable UUID id) {
        return new ApiResponse<>(packService.getPublicPackById(id));
    }
}