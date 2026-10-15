
package com.lunelle.backend.categories.service;

import com.lunelle.backend.categories.dto.CategoryCreateRequest;
import com.lunelle.backend.categories.entity.Category;
import com.lunelle.backend.categories.repository.CategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.lunelle.backend.common.exception.ResourceConflictException;
import com.lunelle.backend.common.exception.ResourceNotFoundException;
import com.lunelle.backend.categories.dto.CategoryUpdateRequest;
import java.util.UUID;

import java.util.List;
import java.util.Locale;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public List<Category> getActiveCategories() {
        return categoryRepository.findAllByActiveTrueOrderByNameAsc();
    }
 
    @Transactional(readOnly = true)
    public List<Category> getAllCategories() {
        return categoryRepository.findAllByOrderByNameAsc();
    }   

    @Transactional(readOnly = true)
    public Category getCategoryById(UUID id) {
        return categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Category not found"
            ));
    }

    @Transactional
    public Category createCategory(CategoryCreateRequest request) {
        String name = request.name().trim();
        String slug = request.slug().trim().toLowerCase(Locale.ROOT);

        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new ResourceConflictException(
                    "A category with this name already exists"
            );
        }

        if (categoryRepository.existsBySlug(slug)) {
            throw new ResourceConflictException(
                    "A category with this slug already exists"
            );
        }

        Category category = Category.createNew(name, slug);

        return categoryRepository.save(category);
    }

    @Transactional
    public Category updateCategory(UUID id, CategoryUpdateRequest request) {
        Category category = categoryRepository.findById(id)
            .orElseThrow(() ->
                new ResourceNotFoundException("Category not found")
            );

        String name = request.name().trim();
        String slug = request.slug().trim().toLowerCase(Locale.ROOT);

        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new ResourceConflictException(
                "A category with this name already exists"
            );
        }

        if (categoryRepository.existsBySlugAndIdNot(slug, id)) {
            throw new ResourceConflictException(
                "A category with this slug already exists"
            );
        }

        category.updateDetails(name, slug);

        return categoryRepository.save(category);
    }
    
    @Transactional
    public Category updateCategoryStatus(UUID id, boolean active) {
        Category category = categoryRepository.findById(id)
            .orElseThrow(() ->
                new ResourceNotFoundException("Category not found")
            );

        category.setActive(active);

        return categoryRepository.save(category);
    }

}