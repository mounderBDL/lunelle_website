package com.lunelle.backend;

import com.lunelle.backend.review.ReviewDtos.ReviewDto;
import com.lunelle.backend.review.ReviewService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ReviewTest extends IntegrationTestBase {

    @Autowired
    private ReviewService reviews;

    @BeforeEach
    void emptyReviews() {
        jdbc.sql("delete from review_screenshot").update();
    }

    @AfterEach
    void cleanReviews() {
        jdbc.sql("delete from review_screenshot").update();
    }

    private ReviewDto add(String name) {
        return reviews.attach("https://img.test/" + name + ".jpg", null, 900, 1600);
    }

    private static void assertHttp(Throwable t, int expected) {
        assertThat(t).isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode().value()).isEqualTo(expected));
    }

    private List<String> urls() {
        return reviews.list().stream().map(r -> r.url().replace("https://img.test/", "").replace(".jpg", "")).toList();
    }

    @Test
    void newScreenshotsGoAtTheEnd() {
        add("a");
        add("b");
        add("c");

        assertThat(urls()).containsExactly("a", "b", "c");
    }

    @Test
    void theImageSizeIsKept() {
        ReviewDto saved = add("a");

        assertThat(saved.width()).isEqualTo(900);
        assertThat(saved.height()).isEqualTo(1600);
        assertThat(reviews.list().get(0).height()).isEqualTo(1600);
    }

    @Test
    void screenshotsCanBeReordered() {
        ReviewDto a = add("a");
        ReviewDto b = add("b");
        ReviewDto c = add("c");

        reviews.reorder(List.of(c.id(), a.id(), b.id()));

        assertThat(urls()).containsExactly("c", "a", "b");
        assertThat(add("d")).isNotNull();
        assertThat(urls()).containsExactly("c", "a", "b", "d");
    }

    @Test
    void aReorderThatDoesNotMatchIsRefused() {
        ReviewDto a = add("a");
        ReviewDto b = add("b");

        assertThatThrownBy(() -> reviews.reorder(List.of(a.id()))).satisfies(t -> assertHttp(t, 400));
        assertThatThrownBy(() -> reviews.reorder(List.of(a.id(), a.id()))).satisfies(t -> assertHttp(t, 400));
        assertThatThrownBy(() -> reviews.reorder(List.of(a.id(), UUID.randomUUID()))).satisfies(t -> assertHttp(t, 400));
        assertThatThrownBy(() -> reviews.reorder(List.of(a.id(), b.id(), UUID.randomUUID()))).satisfies(t -> assertHttp(t, 400));

        assertThat(urls()).containsExactly("a", "b");
    }

    @Test
    void aScreenshotCanBeDeleted() {
        ReviewDto a = add("a");
        add("b");

        reviews.delete(a.id());

        assertThat(urls()).containsExactly("b");
        assertThatThrownBy(() -> reviews.delete(a.id())).satisfies(t -> assertHttp(t, 404));
    }

    @Test
    void thereIsALimit() {
        List<ReviewDto> added = new ArrayList<>();
        for (int i = 0; i < ReviewService.MAX_REVIEWS; i++) {
            added.add(add("r" + i));
        }

        assertThatThrownBy(() -> add("one-too-many")).satisfies(t -> assertHttp(t, 400));
        assertThat(count("review_screenshot")).isEqualTo(ReviewService.MAX_REVIEWS);

        reviews.delete(added.get(0).id());
        assertThat(add("fits-again")).isNotNull();
    }
}
