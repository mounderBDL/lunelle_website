package com.lunelle.backend.setting;

import com.lunelle.backend.setting.SocialLinkDtos.SocialLinkDto;
import com.lunelle.backend.setting.SocialLinkDtos.SocialLinkRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Social links")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SocialLinkController {

    private final SocialLinkService service;

    /** Public: shown in the footer of the shop. */
    @GetMapping("/social-links")
    public List<SocialLinkDto> list() {
        return service.list();
    }

    /** Admin only (under /api/admin): replaces the whole list. */
    @PutMapping("/admin/social-links")
    public List<SocialLinkDto> replace(@Valid @RequestBody List<@Valid SocialLinkRequest> request) {
        return service.replace(request);
    }
}