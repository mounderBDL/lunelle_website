package com.lunelle.backend.delivery;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class DeliveryDtos {

    private DeliveryDtos() {
    }

    public record RateDto(int fee, boolean available) {
    }

    /** officeCount = communes of this wilaya that have a Yalidine office. */
    public record WilayaDeliveryDto(int id, String name, boolean active, RateDto home, RateDto stopDesk,
                                    int officeCount) {
    }

    public record CommuneDto(int id, String name) {
    }

    /** A Yalidine office (stop desk) in a commune. */
    public record OfficeDto(int id, String name, String address) {
    }    

    public record RateUpdate(
            @NotNull @Min(0) @Max(100000) Integer fee,
            @NotNull Boolean available) {
    }

    public record WilayaDeliveryUpdate(
            @NotNull Integer id,
            @NotNull Boolean active,
            @NotNull @Valid RateUpdate home,
            @NotNull @Valid RateUpdate stopDesk) {
    }

    // ───── Yalidine offices (admin) ─────
    public record AdminCommuneDto(int id, String name, boolean active, boolean hasOffice) {
    }

    /** The communes of a wilaya that have an office. An empty list clears them all. */
    public record OfficesRequest(@NotNull @Size(max = 600) List<@NotNull Integer> communeIds) {
    }

    public record OfficeImportResult(int rows, int withOffice, int changed, int ignoredRows,
                                     List<String> unknownIds) {
    }
}