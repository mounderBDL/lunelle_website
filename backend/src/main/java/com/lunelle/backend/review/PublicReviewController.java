package com.lunelle.backend.review;

import com.lunelle.backend.review.ReviewDtos.ReviewDto;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Reviews (public)")
@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class PublicReviewController {

    private final ReviewService service;

    /** The screenshots shown on the shop, in the order chosen in the studio. */
    @GetMapping
    public List<ReviewDto> list() {
        return service.list();
    }
}