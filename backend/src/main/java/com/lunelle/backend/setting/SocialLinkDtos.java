package com.lunelle.backend.setting;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public final class SocialLinkDtos {

    private SocialLinkDtos() {
    }

    public record SocialLinkDto(UUID id, SocialNetwork network, String label, String url) {
    }

    public record SocialLinkRequest(
            @NotNull SocialNetwork network,
            @Size(max = 60) String label,
            @NotBlank @Size(max = 300) String url) {
    }
}