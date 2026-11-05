package com.lunelle.backend.admin;

import java.util.regex.Pattern;

/**
 * What a STAFF account may call. Everything not listed here is OWNER-only, so a new endpoint
 * is private by default.
 */
public final class StaffPolicy {

    private static final Pattern ORDERS = Pattern.compile("^/api/admin/orders(/[^/]+(/[^/]+)?)?/?$");
    private static final Pattern REVIEW_ITEM = Pattern.compile("^/api/admin/reviews/[^/]+$");

    private StaffPolicy() {
    }

    public static boolean allows(String method, String path) {
        // never trust odd-looking paths: dot segments, doubled slashes, path parameters
        if (path.contains("..") || path.contains("//") || path.contains(";")) {
            return false;
        }
        boolean read = "GET".equals(method) || "HEAD".equals(method);
        return switch (path) {
            case "/api/admin/auth/me" -> read;
            case "/api/admin/auth/logout" -> "POST".equals(method);
            // "Running low" card
            case "/api/admin/stats/low-stock" -> read;
            // items for the order editor, without cost prices
            case "/api/admin/order-catalog/products", "/api/admin/order-catalog/packs" -> read;
            // review screenshots: list, add, reorder, delete
            case "/api/admin/reviews" -> read || "POST".equals(method);
            case "/api/admin/reviews/order" -> "PUT".equals(method);
            default -> ORDERS.matcher(path).matches()
                    || ("DELETE".equals(method) && REVIEW_ITEM.matcher(path).matches());
        };
    }
}