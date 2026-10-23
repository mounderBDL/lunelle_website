package com.lunelle.backend.delivery;

import com.lunelle.backend.delivery.DeliveryDtos.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Tag(name = "Delivery (admin)")
@RestController
@RequestMapping("/api/admin/delivery")
@RequiredArgsConstructor
public class AdminDeliveryController {

    private final DeliveryService service;
    private final OfficeService offices;

    @GetMapping("/wilayas")
    public List<WilayaDeliveryDto> list() {
        return service.listForAdmin();
    }

    @PutMapping("/wilayas")
    public List<WilayaDeliveryDto> update(@RequestBody @Valid List<@Valid WilayaDeliveryUpdate> updates) {
        service.update(updates);
        return service.listForAdmin();
    }

    // ───── Yalidine offices ─────

    /** All communes of a wilaya with their office flag (the tick-box screen). */
    @GetMapping("/wilayas/{id}/communes")
    public List<AdminCommuneDto> communes(@PathVariable int id) {
        return offices.communesOf(id);
    }

    /** Saves the ticked communes of one wilaya. Send an empty list to clear them all. */
    @PutMapping("/wilayas/{id}/offices")
    public List<AdminCommuneDto> setOffices(@PathVariable int id, @Valid @RequestBody OfficesRequest request) {
        return offices.setOffices(id, request.communeIds());
    }

    /** Spreadsheet of every commune, to fill in the has_office column. */
    @GetMapping("/communes/export")
    public ResponseEntity<byte[]> export() {
        byte[] body = offices.exportCsv().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("lunelle-communes.csv").build().toString())
                .body(body);
    }

    @PostMapping(path = "/offices/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public OfficeImportResult importOffices(@RequestPart("file") MultipartFile file) throws IOException {
        return offices.importCsv(file.getBytes());
    }
}