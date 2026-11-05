package com.lunelle.backend.review;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ReviewScreenshotRepository extends JpaRepository<ReviewScreenshot, UUID> {

    List<ReviewScreenshot> findAllByOrderBySortOrderAscCreatedAtAsc();

    @Query("select coalesce(max(r.sortOrder), -1) from ReviewScreenshot r")
    int maxSortOrder();
}
