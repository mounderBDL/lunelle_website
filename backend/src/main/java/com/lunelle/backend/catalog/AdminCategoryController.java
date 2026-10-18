package com.lunelle.backend.catalog;

import com.lunelle.backend.catalog.CatalogDtos.CategoryDto;
import com.lunelle.backend.catalog.CatalogDtos.CategoryRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Categories (admin)")
@RestController
@RequestMapping("/api/admin/categories")
@RequiredArgsConstructor
public class AdminCategoryController {

    private final CategoryService service;

    @GetMapping
    public List<CategoryDto> list() {
        return service.listAdmin();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryDto create(@Valid @RequestBody CategoryRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public CategoryDto update(@PathVariable UUID id, @Valid @RequestBody CategoryRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
