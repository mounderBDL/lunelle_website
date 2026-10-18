package com.lunelle.backend.catalog;

import com.lunelle.backend.catalog.CatalogDtos.AdminProductDto;
import com.lunelle.backend.catalog.CatalogDtos.UploadDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/** Not transactional on purpose: the network upload must not hold a database connection. */
@Service
@RequiredArgsConstructor
public class ProductImageService {

    private final MediaService media;
    private final ProductService products;

    public AdminProductDto add(UUID productId, MultipartFile file) {
        products.getAdmin(productId); // 404 before uploading anything
        UploadDto uploaded = media.upload(file, "products");
        try {
            return products.attachImage(productId, uploaded.url(), uploaded.publicId());
        } catch (RuntimeException e) {
            media.delete(uploaded.publicId()); // do not leave an orphan file behind
            throw e;
        }
    }

    public AdminProductDto remove(UUID imageId) {
        ProductService.RemovedImage removed = products.detachImage(imageId);
        media.delete(removed.publicId());
        return removed.product();
    }
}