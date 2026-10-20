package com.lunelle.backend.catalog;

import com.lunelle.backend.catalog.PackDtos.PublicPackDto;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Packs (public)")
@RestController
@RequestMapping("/api/packs")
@RequiredArgsConstructor
public class PublicPackController {

    private final PackService service;

    @GetMapping
    public List<PublicPackDto> list() {
        return service.listPublic();
    }

    @GetMapping("/{slug}")
    public PublicPackDto get(@PathVariable String slug) {
        return service.getPublic(slug);
    }
}