package com.lunelle.backend.shipping;

import com.lunelle.backend.shipping.YalidineSyncService.Status;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** Owner only: StaffPolicy refuses everything it does not list, and it does not list this. */
@Tag(name = "Yalidine sync (admin)")
@RestController
@RequestMapping("/api/admin/delivery/yalidine-sync")
@RequiredArgsConstructor
public class AdminYalidineSyncController {

    private final YalidineSyncService sync;

    @GetMapping
    public Status status() {
        return sync.status();
    }

    /** Starts the sync in the background; poll the status to follow it. */
    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Status start() {
        return sync.start();
    }
}
