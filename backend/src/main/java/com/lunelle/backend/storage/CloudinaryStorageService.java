package com.lunelle.backend.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class CloudinaryStorageService {

    private final Cloudinary cloudinary;

    public CloudinaryStorageService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    public StorageUploadResult uploadProductImage(
        byte[] bytes,
        UUID productId
    ) {
        String publicId = UUID.randomUUID().toString();

        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                bytes,
                ObjectUtils.asMap(
                    "resource_type", "image",
                    "folder", "lunelle/products/" + productId,
                    "public_id", publicId,
                    "overwrite", false,
                    "unique_filename", false
                )
            );

            String url = (String) result.get("secure_url");
            String returnedPublicId = (String) result.get("public_id");

            if (url == null || returnedPublicId == null) {
                throw new IllegalStateException(
                    "Cloudinary did not return the expected image details."
                );
            }

            return new StorageUploadResult(url, returnedPublicId);

        } catch (IOException exception) {
            throw new IllegalStateException(
                "The image could not be uploaded to cloud storage.",
                exception
            );
        }
    }

    public void delete(String publicId) {
        try {
            Map<?, ?> result = cloudinary.uploader().destroy(
                publicId,
                ObjectUtils.emptyMap()
            );

            Object status = result.get("result");

            if (!"ok".equals(status) && !"not found".equals(status)) {
                throw new IllegalStateException(
                    "Cloudinary did not confirm image deletion."
                );
            }

        } catch (IOException exception) {
            throw new IllegalStateException(
                "The cloud image could not be deleted.",
                exception
            );
        }
    }
}