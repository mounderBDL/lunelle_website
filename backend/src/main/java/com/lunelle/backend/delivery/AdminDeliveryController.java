package com.lunelle.backend.delivery;

import com.lunelle.backend.delivery.DeliveryDtos.WilayaDeliveryDto;
import com.lunelle.backend.delivery.DeliveryDtos.WilayaDeliveryUpdate;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Delivery (admin)")
@RestController
@RequestMapping("/api/admin/delivery")
@RequiredArgsConstructor
public class AdminDeliveryController {

    private final DeliveryService service;

    @GetMapping("/wilayas")
    public List<WilayaDeliveryDto> list() {
        return service.listForAdmin();
    }

    @PutMapping("/wilayas")
    public List<WilayaDeliveryDto> update(@RequestBody @Valid List<@Valid WilayaDeliveryUpdate> updates) {
        service.update(updates);
        return service.listForAdmin();
    }
}