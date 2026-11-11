package com.lunelle.backend;

import com.lunelle.backend.admin.StaffPolicy;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StaffPolicyTest {

    private static boolean ok(String method, String path) {
        return StaffPolicy.allows(method, path);
    }

    @Test
    void staffCanWorkWithOrders() {
        String id = "/api/admin/orders/3fa85f64-5717-4562-b3fc-2c963f66afa6";
        assertThat(ok("GET", "/api/admin/orders")).isTrue();
        assertThat(ok("GET", "/api/admin/orders/counts")).isTrue();
        assertThat(ok("GET", id)).isTrue();
        assertThat(ok("PUT", id)).isTrue();
        assertThat(ok("POST", id + "/status")).isTrue();
        assertThat(ok("PUT", id + "/details")).isTrue();
        assertThat(ok("POST", id + "/restock")).isTrue();
        assertThat(ok("POST", id + "/yalidine")).isTrue();        
    }

    @Test
    void staffCanReadLowStockTheirOwnSessionAndTheEditorItems() {
        assertThat(ok("GET", "/api/admin/stats/low-stock")).isTrue();
        assertThat(ok("GET", "/api/admin/auth/me")).isTrue();
        assertThat(ok("POST", "/api/admin/auth/logout")).isTrue();
        assertThat(ok("GET", "/api/admin/order-catalog/products")).isTrue();
        assertThat(ok("GET", "/api/admin/order-catalog/packs")).isTrue();
    }

    @Test
    void everythingElseIsOwnerOnly() {
        assertThat(ok("GET", "/api/admin/team")).isFalse();
        assertThat(ok("GET", "/api/admin/expenses")).isFalse();
        assertThat(ok("POST", "/api/admin/expenses")).isFalse();
        assertThat(ok("DELETE", "/api/admin/expenses/3fa85f64-5717-4562-b3fc-2c963f66afa6")).isFalse();
        assertThat(ok("GET", "/api/admin/delivery/yalidine-sync")).isFalse();
        assertThat(ok("POST", "/api/admin/delivery/yalidine-sync")).isFalse();                
        assertThat(ok("POST", "/api/admin/team")).isFalse();
        assertThat(ok("DELETE", "/api/admin/team/3fa85f64-5717-4562-b3fc-2c963f66afa6")).isFalse();
        assertThat(ok("GET", "/api/admin/stats/overview")).isFalse();
        assertThat(ok("GET", "/api/admin/stats/breakdowns")).isFalse();
        assertThat(ok("GET", "/api/admin/stats/timeseries")).isFalse();
        assertThat(ok("GET", "/api/admin/products")).isFalse();   // has cost prices
        assertThat(ok("GET", "/api/admin/packs")).isFalse();
        assertThat(ok("POST", "/api/admin/variants/x/stock")).isFalse();
        assertThat(ok("GET", "/api/admin/settings")).isFalse();
        assertThat(ok("PUT", "/api/admin/settings")).isFalse();
        assertThat(ok("GET", "/api/admin/delivery/wilayas")).isFalse();
        assertThat(ok("GET", "/api/admin/notifications/telegram/status")).isFalse();
        assertThat(ok("POST", "/api/admin/uploads")).isFalse();
        assertThat(ok("POST", "/api/admin/auth/change-password")).isFalse();
        assertThat(ok("PUT", "/api/admin/auth/profile")).isFalse();
    }

    @Test
    void lookAlikePathsAreRefused() {
        assertThat(ok("GET", "/api/admin/orders/a/b/c")).isFalse();
        assertThat(ok("GET", "/api/admin/ordersX")).isFalse();
        assertThat(ok("GET", "/api/admin/orders/../team")).isFalse();
        assertThat(ok("POST", "/api/admin/stats/low-stock")).isFalse();
        assertThat(ok("GET", "/api/admin/stats/low-stock/extra")).isFalse();
    }

    @Test
    void staffCanManageReviewScreenshots() {
        String id = "/api/admin/reviews/3fa85f64-5717-4562-b3fc-2c963f66afa6";
        assertThat(ok("GET", "/api/admin/reviews")).isTrue();
        assertThat(ok("POST", "/api/admin/reviews")).isTrue();
        assertThat(ok("PUT", "/api/admin/reviews/order")).isTrue();
        assertThat(ok("DELETE", id)).isTrue();

        assertThat(ok("PUT", id)).isFalse();
        assertThat(ok("GET", id)).isFalse();
        assertThat(ok("DELETE", "/api/admin/reviews")).isFalse();
        assertThat(ok("POST", "/api/admin/reviews/order")).isFalse();
        assertThat(ok("DELETE", id + "/x")).isFalse();
    }
}
