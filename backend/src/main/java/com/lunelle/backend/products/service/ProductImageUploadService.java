package com.lunelle.backend.products.service;

import com.lunelle.backend.common.exception.ResourceNotFoundException;
import com.lunelle.backend.products.dto.ProductImageResponse;
import com.lunelle.backend.products.repository.ProductRepository;
import com.lunelle.backend.storage.CloudinaryStorageService;
import com.lunelle.backend.storage.StorageUploadResult;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ProductImageUploadService {

    private static final Logger log =
        LoggerFactory.getLogger(ProductImageUploadService.class);

    private final ProductRepository productRepository;
    private final ProductImageValidator imageValidator;
    private final CloudinaryStorageService storageService;
    private final ProductImagePersistenceService persistenceService;

    public ProductImageUploadService(
        ProductRepository productRepository,
        ProductImageValidator imageValidator,
        CloudinaryStorageService storageService,
        ProductImagePersistenceService persistenceService
    ) {
        this.productRepository = productRepository;
        this.imageValidator = imageValidator;
        this.storageService = storageService;
        this.persistenceService = persistenceService;
    }

    public ProductImageResponse upload(
        UUID productId,
        MultipartFile file,
        boolean isPrimary,
        int displayOrder
    ) {
        if (displayOrder < 0) {
            throw new IllegalArgumentException(
                "Display order cannot be negative."
            );
        }

        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found.");
        }

        byte[] bytes = imageValidator.validateAndRead(file);

        StorageUploadResult uploaded =
            storageService.uploadProductImage(bytes, productId);

        try {
            return persistenceService.saveImage(
                productId,
                uploaded,
                isPrimary,
                displayOrder
            );
        } catch (RuntimeException exception) {
            try {
                storageService.delete(uploaded.publicId());
            } catch (RuntimeException cleanupException) {
                exception.addSuppressed(cleanupException);

                log.error(
                    "Failed to clean up Cloudinary asset {} after database failure.",
                    uploaded.publicId(),
                    cleanupException
                );
            }

            throw exception;
        }
    }
}
