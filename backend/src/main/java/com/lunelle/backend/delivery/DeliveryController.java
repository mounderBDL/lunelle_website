package com.lunelle.backend.delivery;

import com.lunelle.backend.delivery.DeliveryDtos.CommuneDto;
import com.lunelle.backend.delivery.DeliveryDtos.WilayaDeliveryDto;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Delivery (public)")
@RestController
@RequestMapping("/api/delivery")
@RequiredArgsConstructor
public class DeliveryController {

    private final DeliveryService service;

    @GetMapping("/wilayas")
    public List<WilayaDeliveryDto> wilayas() {
        return service.listForCheckout();
    }

    @GetMapping("/wilayas/{id}/communes")
    public List<CommuneDto> communes(@PathVariable int id) {
        return service.communesOf(id);
    }
}