package com.lunelle.backend.products.controller;

import com.lunelle.backend.products.dto.ProductPageResponse;
import com.lunelle.backend.products.dto.ProductResponse;
import com.lunelle.backend.products.dto.ProductStatusRequest;
import com.lunelle.backend.products.dto.ProductUpdateRequest;
import com.lunelle.backend.products.service.ProductService;

import jakarta.validation.Valid;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.lunelle.backend.common.response.ApiResponse;
import com.lunelle.backend.products.dto.ProductCreateRequest;
import com.lunelle.backend.products.dto.ProductDetailsResponse;
import com.lunelle.backend.products.dto.ProductImageResponse;
import com.lunelle.backend.products.service.ProductImagePersistenceService;
import com.lunelle.backend.products.service.ProductImageUploadService;


import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;


@RestController
@RequestMapping("/api/v1")
public class ProductController {

    private final ProductService productService;
    private final ProductImageUploadService productImageUploadService;
    private final ProductImagePersistenceService productImagePersistenceService;

    public ProductController(
        ProductService productService,
        ProductImageUploadService productImageUploadService,
        ProductImagePersistenceService productImagePersistenceService
    ) {
        this.productService = productService;
        this.productImageUploadService = productImageUploadService;
        this.productImagePersistenceService = productImagePersistenceService;
    }

    @GetMapping("/products")
    public ProductPageResponse getProducts(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit,
        @RequestParam(name = "category_id", required = false) UUID categoryId,
        @RequestParam(required = false) String search,
        @RequestParam(name = "sort_by", defaultValue = "created_at")
        String sortBy,
        @RequestParam(name = "sort_direction", defaultValue = "desc")
        String sortDirection
    ) {
        return productService.getPublicProducts(
            page,
            limit,
            categoryId,
            search,
            sortBy,
            sortDirection
        );
    }

    @GetMapping("/products/{id}")
    public ProductDetailsResponse getPublicProductById(
            @PathVariable UUID id) {
        return productService.getPublicProductById(id);
    }

    @PostMapping("/admin/products")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ProductResponse> createProduct(
        @Valid @RequestBody ProductCreateRequest request
    ) {
        return new ApiResponse<>(productService.createProduct(request));
    }

    @PatchMapping("/admin/products/{id}")
    public ApiResponse<ProductResponse> updateProduct(
        @PathVariable UUID id,
        @Valid @RequestBody ProductUpdateRequest request
    ) {
        return new ApiResponse<>(
            productService.updateProduct(id, request)
        );
    }

    @PatchMapping("/admin/products/{id}/status")
    public ApiResponse<ProductResponse> updateProductStatus(
        @PathVariable UUID id,
        @Valid @RequestBody ProductStatusRequest request
    ) {
        return new ApiResponse<>(
            productService.updateProductStatus(id, request)
        );
    }

    @GetMapping("/admin/products/{id}/images")
    public ApiResponse<List<ProductImageResponse>> getAdminProductImages(
        @PathVariable UUID id
    ) {
        return new ApiResponse<>(
            productService.getAdminProductImages(id)
        );
    }

    @PostMapping("/admin/products/{id}/images")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ProductImageResponse> uploadProductImage(
        @PathVariable UUID id,
        @RequestPart("file") MultipartFile file,
        @RequestParam(name = "is_primary", defaultValue = "false")
        boolean isPrimary,
        @RequestParam(name = "display_order", defaultValue = "0")
        int displayOrder
    ) {
        return new ApiResponse<>(
            productImageUploadService.upload(
                id,
                file,
                isPrimary,
                displayOrder
            )
        );
    }

    @PatchMapping("/admin/products/{productId}/images/{imageId}/primary")
    public ApiResponse<ProductImageResponse> setPrimaryImage(
        @PathVariable UUID productId,
        @PathVariable UUID imageId
    ) {
        return new ApiResponse<>(
            productImagePersistenceService.setPrimaryImage(productId, imageId)
        );
    }

    @DeleteMapping("/admin/products/{productId}/images/{imageId}")
    public ResponseEntity<Void> deleteProductImage(
        @PathVariable UUID productId,
        @PathVariable UUID imageId
    ) {
        productImagePersistenceService.deleteImage(
            productId,
            imageId
        );

        return ResponseEntity.noContent().build();
    }
}