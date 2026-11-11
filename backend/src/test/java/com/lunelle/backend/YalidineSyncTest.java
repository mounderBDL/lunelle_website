package com.lunelle.backend;

import com.lunelle.backend.shipping.YalidineClient;
import com.lunelle.backend.shipping.YalidineSyncService;
import com.lunelle.backend.shipping.YalidineSyncService.Summary;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@TestPropertySource(properties = "app.yalidine.pause-ms=0")
class YalidineSyncTest extends IntegrationTestBase {

    @Autowired
    private YalidineSyncService sync;

    @MockitoBean
    private YalidineClient yalidine;

    private static Map<String, Object> m(Object... keysAndValues) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < keysAndValues.length; i += 2) {
            map.put((String) keysAndValues[i], keysAndValues[i + 1]);
        }
        return map;
    }

    // The sync rewrites shared reference data, so every test puts it back as it was.
    @BeforeEach
    void snapshot() {
        for (String table : List.of("wilaya", "commune", "delivery_rate")) {
            jdbc.sql("drop table if exists bak_" + table).update();
            jdbc.sql("create table bak_" + table + " as select * from " + table).update();
        }
    }

    @AfterEach
    void restore() {
        jdbc.sql("update wilaya w set name = b.name, is_active = b.is_active from bak_wilaya b where w.id = b.id").update();
        jdbc.sql("delete from commune where id not in (select id from bak_commune)").update();
        jdbc.sql("update commune c set wilaya_id = b.wilaya_id, name = b.name, external_id = b.external_id, "
                + "is_active = b.is_active, has_office = b.has_office, center_id = b.center_id "
                + "from bak_commune b where c.id = b.id").update();
        jdbc.sql("update delivery_rate r set fee = b.fee, is_available = b.is_available "
                + "from bak_delivery_rate b where r.id = b.id").update();
        for (String table : List.of("wilaya", "commune", "delivery_rate")) {
            jdbc.sql("drop table if exists bak_" + table).update();
        }
    }

    private void yalidineAnswers() {
        when(yalidine.fromWilaya()).thenReturn("Batna");
        when(yalidine.getAll("wilayas/")).thenReturn(List.of(
                m("id", 5, "name", "Batna", "is_deliverable", 1),
                m("id", 16, "name", "Alger", "is_deliverable", 1),
                m("id", 1, "name", "Adrar", "is_deliverable", 0)));
        when(yalidine.getAll("communes/")).thenReturn(List.of(
                m("id", 99901, "name", "Zzz Test Commune", "wilaya_id", 16, "has_stop_desk", 1, "is_deliverable", 1),
                m("id", 99902, "name", "Zzz Second", "wilaya_id", 16, "has_stop_desk", 0, "is_deliverable", 1)));
        when(yalidine.getAll("centers/")).thenReturn(List.of(
                m("center_id", 160102, "commune_id", 99901),
                m("center_id", 160101, "commune_id", 99901)));
        when(yalidine.fees(5, 5)).thenReturn(m("per_commune", m()));
        when(yalidine.fees(5, 16)).thenReturn(m("per_commune", m(
                "99901", m("express_home", 700, "express_desk", 450),
                "99902", m("express_home", 700, "express_desk", 450),
                "99903", m("express_home", 800, "express_desk", 450))));
    }

    @Test
    void importsWilayasCommunesOfficesAndFees() {
        yalidineAnswers();

        Summary summary = sync.syncNow();

        assertThat(summary.communesAdded()).isEqualTo(2);
        assertThat(summary.withStopDesk()).isEqualTo(1);
        assertThat(summary.communesClosed()).isPositive();

        // the commune with a desk: Yalidine id saved, office on, lowest center id kept
        var desk = jdbc.sql("select has_office, center_id, is_active from commune where external_id = 99901")
                .query((rs, n) -> new Object[]{rs.getBoolean(1), rs.getInt(2), rs.getBoolean(3)}).single();
        assertThat(desk).containsExactly(true, 160101, true);
        assertThat(jdbc.sql("select has_office from commune where external_id = 99902")
                .query(Boolean.class).single()).isFalse();

        // wilayas follow Yalidine: names and open/closed
        assertThat(jdbc.sql("select name from wilaya where id = 16").query(String.class).single()).isEqualTo("Alger");
        assertThat(jdbc.sql("select is_active from wilaya where id = 1").query(Boolean.class).single()).isFalse();

        // fees: the most common value among the communes
        assertThat(jdbc.sql("select fee from delivery_rate where wilaya_id = 16 and method = 'HOME'")
                .query(Integer.class).single()).isEqualTo(700);
        assertThat(jdbc.sql("select fee from delivery_rate where wilaya_id = 16 and method = 'STOP_DESK'")
                .query(Integer.class).single()).isEqualTo(450);
        assertThat(jdbc.sql("select is_available from delivery_rate where wilaya_id = 16 and method = 'STOP_DESK'")
                .query(Boolean.class).single()).isTrue();

        // the old communes of a covered wilaya are closed, none is left open without a Yalidine id
        assertThat(jdbc.sql("select count(*) from commune where wilaya_id = 16 and is_active and external_id is null")
                .query(Long.class).single()).isZero();
    }

    @Test
    void runningItTwiceChangesNothingTheSecondTime() {
        yalidineAnswers();
        sync.syncNow();

        Summary again = sync.syncNow();

        assertThat(again.communesAdded()).isZero();
        assertThat(again.communesClosed()).isZero();
        assertThat(again.feesUpdated()).isZero();
    }

    @Test
    void anUnknownSenderWilayaStopsTheSyncBeforeAnythingIsSaved() {
        yalidineAnswers();
        when(yalidine.fromWilaya()).thenReturn("Nowhere");

        assertThatThrownBy(() -> sync.syncNow()).isInstanceOf(ResponseStatusException.class);
        assertThat(jdbc.sql("select count(*) from commune where external_id = 99901").query(Long.class).single())
                .isZero();
    }
}
