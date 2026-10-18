package com.lunelle.backend.catalog;

import java.text.Normalizer;
import java.util.Locale;
import java.util.function.Predicate;

final class TextUtil {

    private TextUtil() {
    }

    static String slugify(String text) {
        String s = Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
        return s.isEmpty() ? "item" : s;
    }

    static String uniqueSlug(String text, Predicate<String> exists) {
        String base = slugify(text);
        String slug = base;
        int n = 2;
        while (exists.test(slug)) {
            slug = base + "-" + n++;
        }
        return slug;
    }

    static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}