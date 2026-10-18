package com.lunelle.backend.delivery;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public final class DeliveryDtos {

    private DeliveryDtos() {
    }

    public record RateDto(int fee, boolean available) {
    }

    public record WilayaDeliveryDto(int id, String name, boolean active, RateDto home, RateDto stopDesk) {
    }

    public record CommuneDto(int id, String name) {
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
}