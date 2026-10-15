package com.lunelle.backend.categories.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CategoryUpdateRequest(
    @NotBlank(message = "Category name is required")
    @Size(max = 150, message = "Category name must not exceed 150 characters")
    String name,

    @NotBlank(message = "Category slug is required")
    @Size(max = 180, message = "Category slug must not exceed 180 characters")
    @Pattern(
        regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        message = "Slug must contain lowercase letters, numbers, and single hyphens"
    )
    String slug
) {}