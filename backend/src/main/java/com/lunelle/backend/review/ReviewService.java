package com.lunelle.backend.review;

import com.lunelle.backend.catalog.MediaService;
import com.lunelle.backend.catalog.MediaService.Uploaded;
import com.lunelle.backend.review.ReviewDtos.ReviewDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    public static final int MAX_REVIEWS = 24;

    private final ReviewScreenshotRepository repository;
    private final MediaService media;

    @Transactional(readOnly = true)
    public List<ReviewDto> list() {
        return repository.findAllByOrderBySortOrderAscCreatedAtAsc().stream().map(ReviewDto::from).toList();
    }

    /** Not transactional on purpose: the network upload must not hold a database connection. */
    public ReviewDto add(MultipartFile file) {
        assertRoom();
        Uploaded uploaded = media.uploadImage(file, "reviews");
        try {
            return attach(uploaded.url(), uploaded.publicId(), uploaded.width(), uploaded.height());
        } catch (RuntimeException e) {
            media.delete(uploaded.publicId()); // do not leave an orphan file behind
            throw e;
        }
    }

    /** Saves an image that is already uploaded; it goes at the end of the list. */
    @Transactional
    public ReviewDto attach(String url, String publicId, int width, int height) {
        assertRoom();
        ReviewScreenshot review = new ReviewScreenshot();
        review.setUrl(url);
        review.setPublicId(publicId);
        review.setWidth(width);
        review.setHeight(height);
        review.setSortOrder(repository.maxSortOrder() + 1);
        return ReviewDto.from(repository.save(review));
    }

    @Transactional
    public List<ReviewDto> reorder(List<UUID> ids) {
        List<ReviewScreenshot> all = repository.findAllByOrderBySortOrderAscCreatedAtAsc();
        Set<UUID> existing = all.stream().map(ReviewScreenshot::getId).collect(Collectors.toSet());
        if (ids.size() != existing.size() || !existing.equals(new HashSet<>(ids))) {
            throw bad("The list does not match the current screenshots");
        }
        Map<UUID, ReviewScreenshot> byId = all.stream()
                .collect(Collectors.toMap(ReviewScreenshot::getId, Function.identity()));
        for (int i = 0; i < ids.size(); i++) {
            byId.get(ids.get(i)).setSortOrder(i);
        }
        repository.saveAll(all);
        return all.stream()
                .sorted(Comparator.comparingInt(ReviewScreenshot::getSortOrder))
                .map(ReviewDto::from)
                .toList();
    }

    public void delete(UUID id) {
        ReviewScreenshot review = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Screenshot not found"));
        repository.delete(review);
        media.delete(review.getPublicId());
    }

    private void assertRoom() {
        if (repository.count() >= MAX_REVIEWS) {
            throw bad("You can show at most " + MAX_REVIEWS + " screenshots. Delete one to add another");
        }
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
