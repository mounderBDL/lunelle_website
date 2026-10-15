package com.lunelle.backend.categories.controller;

import com.lunelle.backend.categories.dto.CategoryCreateRequest;
import com.lunelle.backend.categories.dto.CategoryResponse;
import com.lunelle.backend.categories.entity.Category;
import com.lunelle.backend.categories.service.CategoryService;
import com.lunelle.backend.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;
import com.lunelle.backend.categories.dto.CategoryUpdateRequest;
import org.springframework.web.bind.annotation.PatchMapping;
import com.lunelle.backend.categories.dto.CategoryStatusRequest;
import java.util.UUID;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping("/categories")
    public ApiResponse<List<CategoryResponse>> getActiveCategories() {
        List<CategoryResponse> categories = categoryService
                .getActiveCategories()
                .stream()
                .map(this::toResponse)
                .toList();

        return new ApiResponse<>(categories);
    }

    
    @GetMapping("/admin/categories")
    public ApiResponse<List<CategoryResponse>> getAllCategoriesForAdmin() {
        List<CategoryResponse> categories = categoryService.getAllCategories().stream()
            .map(this::toResponse)
            .toList();

        return new ApiResponse<>(categories);
    }
    
    @GetMapping("/admin/categories/{id}")
    public ApiResponse<CategoryResponse> getCategoryById(
            @PathVariable UUID id) {

        Category category = categoryService.getCategoryById(id);

        return new ApiResponse<>(toResponse(category));
    }

    @PostMapping("/admin/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CategoryResponse> createCategory(
            @Valid @RequestBody CategoryCreateRequest request) {

        Category category = categoryService.createCategory(request);

        return new ApiResponse<>(toResponse(category));
    }

    @PatchMapping("/admin/categories/{id}")
    public ApiResponse<CategoryResponse> updateCategory(
            @PathVariable UUID id,
            @Valid @RequestBody CategoryUpdateRequest request) {

        Category category = categoryService.updateCategory(id, request);

        return new ApiResponse<>(toResponse(category));
    }
    
    @PatchMapping("/admin/categories/{id}/status")
    public ApiResponse<CategoryResponse> updateCategoryStatus(
            @PathVariable UUID id,
            @Valid @RequestBody CategoryStatusRequest request) {

        Category category = categoryService.updateCategoryStatus(
            id,
            request.is_active()
        );

        return new ApiResponse<>(toResponse(category));
    }


    private CategoryResponse toResponse(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getSlug()
        );
    } 
}