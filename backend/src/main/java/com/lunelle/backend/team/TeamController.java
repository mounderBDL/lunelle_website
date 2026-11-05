package com.lunelle.backend.team;

import com.lunelle.backend.team.TeamDtos.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Owner only: StaffPolicy lets staff reach none of these. */
@Tag(name = "Team (admin)")
@RestController
@RequestMapping("/api/admin/team")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService service;

    @GetMapping
    public List<MemberDto> list() {
        return service.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MemberDto create(@Valid @RequestBody CreateMemberRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public MemberDto update(@PathVariable UUID id, @Valid @RequestBody UpdateMemberRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
