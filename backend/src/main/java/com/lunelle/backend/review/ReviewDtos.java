package com.lunelle.backend.review;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public final class ReviewDtos {

    private ReviewDtos() {
    }

    public record ReviewDto(UUID id, String url, int width, int height) {
        static ReviewDto from(ReviewScreenshot r) {
            return new ReviewDto(r.getId(), r.getUrl(), r.getWidth(), r.getHeight());
        }
    }

    /** All the screenshot ids, in the order they should appear. */
    public record ReorderRequest(@NotNull @Size(max = 100) List<@NotNull UUID> ids) {
    }
}