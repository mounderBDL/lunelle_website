package com.lunelle.backend.review;

import com.lunelle.backend.review.ReviewDtos.ReorderRequest;
import com.lunelle.backend.review.ReviewDtos.ReviewDto;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/** Open to the owner and to team members (see StaffPolicy). */
@Tag(name = "Reviews (admin)")
@RestController
@RequestMapping("/api/admin/reviews")
@RequiredArgsConstructor
public class AdminReviewController {

    private final ReviewService service;

    @GetMapping
    public List<ReviewDto> list() {
        return service.list();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewDto add(@RequestPart("file") MultipartFile file) {
        return service.add(file);
    }

    @PutMapping("/order")
    public List<ReviewDto> reorder(@Valid @RequestBody ReorderRequest request) {
        return service.reorder(request.ids());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
