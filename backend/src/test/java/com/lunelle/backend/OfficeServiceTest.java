package com.lunelle.backend;

import com.lunelle.backend.delivery.DeliveryDtos.OfficeImportResult;
import com.lunelle.backend.delivery.OfficeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OfficeServiceTest extends IntegrationTestBase {

    @Autowired
    private OfficeService offices;

    @Test
    void ticksReplaceTheWholeListOfAWilaya() {
        int a = communeOf(16, 0);
        int b = communeOf(16, 1);
        int c = communeOf(16, 2);

        offices.setOffices(16, List.of(a, b));
        assertThat(countOffices(16)).isEqualTo(2);

        offices.setOffices(16, List.of(c));
        assertThat(countOffices(16)).isEqualTo(1);
        assertThat(isOffice(c)).isTrue();
        assertThat(isOffice(a)).isFalse();

        offices.setOffices(16, List.of());
        assertThat(countOffices(16)).isZero();
    }

    @Test
    void communesOfAnotherWilayaAreRejected() {
        int oran = communeOf(31, 0);
        assertThatThrownBy(() -> offices.setOffices(16, List.of(oran)))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode().value()).isEqualTo(400));
    }

    @Test
    void csvImportSetsAndClearsOffices() {
        int a = communeOf(16, 0);
        int b = communeOf(16, 1);
        offices.setOffices(16, List.of(b));

        String csv = "commune_id;wilaya_code;wilaya_name;commune_name;has_office\r\n"
                + a + ";16;Alger;X;yes\r\n"
                + b + ";16;Alger;Y;\r\n"
                + "999999;16;Alger;Z;yes\r\n";
        OfficeImportResult result = offices.importCsv(csv.getBytes(StandardCharsets.UTF_8));

        assertThat(isOffice(a)).isTrue();
        assertThat(isOffice(b)).isFalse();
        assertThat(result.rows()).isEqualTo(2);
        assertThat(result.withOffice()).isEqualTo(1);
        assertThat(result.changed()).isEqualTo(2);
        assertThat(result.unknownIds()).containsExactly("999999");
    }

    @Test
    void anExportedFileCanBeImportedBack() {
        offices.setOffices(16, List.of(communeOf(16, 0)));
        String csv = offices.exportCsv();

        offices.setOffices(16, List.of());
        OfficeImportResult result = offices.importCsv(csv.getBytes(StandardCharsets.UTF_8));

        assertThat(countOffices(16)).isEqualTo(1);
        assertThat(result.changed()).isEqualTo(1);
        assertThat(result.unknownIds()).isEmpty();
    }

    @Test
    void aFileWithoutTheExpectedColumnsIsRefused() {
        assertThatThrownBy(() -> offices.importCsv("name;city\r\nx;y\r\n".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode().value()).isEqualTo(400));
    }
}
