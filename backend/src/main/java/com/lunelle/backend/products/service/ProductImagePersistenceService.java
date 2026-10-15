package com.lunelle.backend.products.service;

import com.lunelle.backend.common.exception.ResourceNotFoundException;
import com.lunelle.backend.products.dto.ProductImageResponse;
import com.lunelle.backend.products.entity.Product;
import com.lunelle.backend.products.entity.ProductImage;
import com.lunelle.backend.products.repository.ProductImageRepository;
import com.lunelle.backend.products.repository.ProductRepository;
import com.lunelle.backend.storage.StorageUploadResult;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.lunelle.backend.storage.CloudinaryStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class ProductImagePersistenceService {

    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private static final Logger log =
        LoggerFactory.getLogger(ProductImagePersistenceService.class);

    private final CloudinaryStorageService cloudinaryStorageService;

    public ProductImagePersistenceService(
        ProductRepository productRepository,
        ProductImageRepository productImageRepository,
        CloudinaryStorageService cloudinaryStorageService
    ) {
        this.productRepository = productRepository;
        this.productImageRepository = productImageRepository;
        this.cloudinaryStorageService = cloudinaryStorageService;
    }

    @Transactional
    public ProductImageResponse saveImage(
        UUID productId,
        StorageUploadResult upload,
        boolean requestedPrimary,
        int displayOrder
    ) {
        Product product = productRepository.findByIdForUpdate(productId)
            .orElseThrow(() ->
                new ResourceNotFoundException("Product not found.")
            );

        var currentPrimary =
            productImageRepository.findByProduct_IdAndPrimaryTrue(
                productId
            );

        boolean makePrimary = requestedPrimary
            || currentPrimary.isEmpty();

        if (makePrimary && currentPrimary.isPresent()) {
            ProductImage existingPrimary = currentPrimary.get();
            existingPrimary.setPrimary(false);
            productImageRepository.saveAndFlush(existingPrimary);
        }

        ProductImage image = ProductImage.create(
            product,
            upload.url(),
            upload.publicId(),
            makePrimary,
            displayOrder
        );

        ProductImage saved = productImageRepository.saveAndFlush(image);

        return new ProductImageResponse(
            saved.getId(),
            saved.getImageUrl(),
            saved.isPrimary(),
            saved.getDisplayOrder()
        );
    }

    @Transactional
    public ProductImageResponse setPrimaryImage(UUID productId, UUID imageId) {
        // Lock the product to serialize image changes for this product.
        productRepository.findByIdForUpdate(productId)
            .orElseThrow(() -> new ResourceNotFoundException("Product not found."));

        // Ensure the selected image belongs to this product.
        ProductImage selectedImage = productImageRepository
            .findByIdAndProduct_Id(imageId, productId)
            .orElseThrow(() -> new ResourceNotFoundException("Product image not found."));

        // If it is already primary, return successfully without changing anything.
        if (selectedImage.isPrimary()) {
            return new ProductImageResponse(
                selectedImage.getId(),
                selectedImage.getImageUrl(),
                true,
                selectedImage.getDisplayOrder()
            );
        }

        // Demote the current primary image before promoting the new one.
        var currentPrimary = productImageRepository
            .findByProduct_IdAndPrimaryTrue(productId);

        if (currentPrimary.isPresent()) {
            ProductImage oldPrimary = currentPrimary.get();
            oldPrimary.setPrimary(false);
            productImageRepository.saveAndFlush(oldPrimary);
        }

        selectedImage.setPrimary(true);
        ProductImage saved = productImageRepository.saveAndFlush(selectedImage);

        return new ProductImageResponse(
            saved.getId(),
            saved.getImageUrl(),
            saved.isPrimary(),
            saved.getDisplayOrder()
        );
    }

    @Transactional
    public void deleteImage(UUID productId, UUID imageId) {
        // Lock the product to serialize image operations for this product.
        productRepository.findByIdForUpdate(productId)
            .orElseThrow(() ->
                new ResourceNotFoundException("Product not found.")
            );

        ProductImage image = productImageRepository
            .findByIdAndProduct_Id(imageId, productId)
            .orElseThrow(() ->
                new ResourceNotFoundException("Product image not found.")
            );

        // Delete the Cloudinary file first.
        // If this fails, the database record remains unchanged.
        cloudinaryStorageService.delete(image.getPublicId());

        // If the deleted image is primary, promote another image if available.
        if (image.isPrimary()) {
            var remainingImages =
                productImageRepository
                    .findAllByProduct_IdOrderByDisplayOrderAscCreatedAtAsc(
                        productId
                    );

            ProductImage replacement = remainingImages.stream()
                .filter(other -> !other.getId().equals(imageId))
                .findFirst()
                .orElse(null);

            if (replacement != null) {
                replacement.setPrimary(true);
                productImageRepository.saveAndFlush(replacement);
            }
        }

        productImageRepository.delete(image);
        productImageRepository.flush();

        log.info(
            "Deleted image {} for product {}",
            imageId,
            productId
        );
    }
}
