package com.lunelle.backend.catalog;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.lunelle.backend.catalog.CatalogDtos.UploadDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class MediaService {

    public static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final Set<String> FOLDERS = Set.of("products", "categories", "packs", "banners", "reviews");

    /** An uploaded image: where it lives and how big it is (0 when unknown). */
    public record Uploaded(String url, String publicId, int width, int height) {
    }

    private final Cloudinary cloudinary;

    public UploadDto upload(MultipartFile file, String folder) {
        Uploaded uploaded = uploadImage(file, folder);
        return new UploadDto(uploaded.url(), uploaded.publicId());
    }

    public Uploaded uploadImage(MultipartFile file, String folder) {
        if (!FOLDERS.contains(folder)) {
            throw bad("Unknown folder");
        }
        if (file == null || file.isEmpty()) {
            throw bad("No file received");
        }
        if (file.getSize() > MAX_BYTES) {
            throw bad("Image too large (maximum 5 MB)");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw bad("Could not read the file");
        }
        if (!looksLikeImage(bytes)) {
            throw bad("Only JPEG, PNG or WebP images are accepted");
        }
        try {
            Map<?, ?> result = cloudinary.uploader().upload(bytes, ObjectUtils.asMap(
                    "folder", "lunelle/" + folder,
                    "resource_type", "image"));
            return new Uploaded((String) result.get("secure_url"), (String) result.get("public_id"),
                    size(result.get("width")), size(result.get("height")));
        } catch (Exception e) {
            log.error("Cloudinary upload failed", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Image upload failed, please try again");
        }
    }

    /** Best effort: a failure here must never break the request. */
    public void delete(String publicId) {
        if (publicId == null || publicId.isBlank()) {
            return;
        }
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (Exception e) {
            log.warn("Could not delete Cloudinary asset {}", publicId, e);
        }
    }

    private static int size(Object value) {
        return value instanceof Number number ? number.intValue() : 0;
    }

    /** Checks the file signature (magic bytes): JPEG, PNG or WebP. */
    private static boolean looksLikeImage(byte[] b) {
        if (b.length < 12) {
            return false;
        }
        boolean jpeg = (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF;
        boolean png = (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G';
        boolean webp = b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
        return jpeg || png || webp;
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}