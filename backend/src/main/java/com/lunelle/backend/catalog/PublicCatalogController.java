package com.lunelle.backend.catalog;

import com.lunelle.backend.catalog.CatalogDtos.PublicCategoryDto;
import com.lunelle.backend.catalog.CatalogDtos.PublicProductDto;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Catalog (public)")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PublicCatalogController {

    private final CategoryService categories;
    private final ProductService products;

    @GetMapping("/categories")
    public List<PublicCategoryDto> categories() {
        return categories.listPublic();
    }

    @GetMapping("/products")
    public List<PublicProductDto> products(@RequestParam(required = false) String category,
                                           @RequestParam(required = false) Boolean featured) {
        return products.listPublic(category, featured);
    }

    @GetMapping("/products/{slug}")
    public PublicProductDto product(@PathVariable String slug) {
        return products.getPublic(slug);
    }
}