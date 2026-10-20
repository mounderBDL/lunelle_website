package com.lunelle.backend.catalog;

import com.lunelle.backend.catalog.PackDtos.AdminPackDto;
import com.lunelle.backend.catalog.PackDtos.PackRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Packs (admin)")
@RestController
@RequestMapping("/api/admin/packs")
@RequiredArgsConstructor
public class AdminPackController {

    private final PackService service;

    @GetMapping
    public List<AdminPackDto> list(@RequestParam(defaultValue = "false") boolean includeArchived) {
        return service.listAdmin(includeArchived);
    }

    @GetMapping("/{id}")
    public AdminPackDto get(@PathVariable UUID id) {
        return service.getAdmin(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminPackDto create(@Valid @RequestBody PackRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public AdminPackDto update(@PathVariable UUID id, @Valid @RequestBody PackRequest request) {
        return service.update(id, request);
    }

    /** Archives the pack (never physically deleted). */
    @DeleteMapping("/{id}")
    public AdminPackDto archive(@PathVariable UUID id) {
        return service.archive(id);
    }

    @PostMapping("/{id}/restore")
    public AdminPackDto restore(@PathVariable UUID id) {
        return service.restore(id);
    }
}