package com.lunelle.backend.catalog;

import com.lunelle.backend.catalog.CatalogDtos.AdminProductDto;
import com.lunelle.backend.catalog.CatalogDtos.ReorderImagesRequest;
import com.lunelle.backend.catalog.CatalogDtos.UploadDto;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Tag(name = "Images (admin)")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminMediaController {

    private final ProductImageService productImages;
    private final ProductService products;
    private final MediaService media;

    @PostMapping(path = "/products/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public AdminProductDto addImage(@PathVariable UUID id, @RequestPart("file") MultipartFile file) {
        return productImages.add(id, file);
    }

    @DeleteMapping("/product-images/{id}")
    public AdminProductDto removeImage(@PathVariable UUID id) {
        return productImages.remove(id);
    }

    /** Body: the product's image ids in the desired order (first = main image). */
    @PutMapping("/products/{id}/images/order")
    public AdminProductDto reorder(@PathVariable UUID id, @Valid @RequestBody ReorderImagesRequest request) {
        return products.reorderImages(id, request.imageIds());
    }

    /** Generic upload (category, pack and banner images). Returns the URL to save on the item. */
    @PostMapping(path = "/uploads", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UploadDto upload(@RequestParam String folder, @RequestPart("file") MultipartFile file) {
        return media.upload(file, folder);
    }
}