package com.lunelle.backend.delivery;

import com.lunelle.backend.delivery.DeliveryDtos.CommuneDto;
import com.lunelle.backend.delivery.DeliveryDtos.WilayaDeliveryDto;
import com.lunelle.backend.delivery.DeliveryDtos.OfficeDto;
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

    /** officeOnly=true: only the communes that have a Yalidine office (for "office" delivery). */
    @GetMapping("/wilayas/{id}/communes")
    public List<CommuneDto> communes(@PathVariable int id,
                                     @RequestParam(defaultValue = "false") boolean officeOnly) {
        return service.communesOf(id, officeOnly);
    }
 
    /** The Yalidine offices of a commune (a commune can have several). */
    @GetMapping("/communes/{id}/offices")
    public List<OfficeDto> offices(@PathVariable int id) {
        return service.officesOf(id);
    }    
}