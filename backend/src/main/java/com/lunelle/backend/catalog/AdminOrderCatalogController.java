package com.lunelle.backend.catalog;

import com.lunelle.backend.catalog.CatalogDtos.LocalizedName;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** What the order editor needs to pick items: names, prices and stock, never cost prices. Open to staff. */
@Tag(name = "Order editor items (admin)")
@RestController
@RequestMapping("/api/admin/order-catalog")
@RequiredArgsConstructor
public class AdminOrderCatalogController {

    private final ProductService products;
    private final PackService packs;

    public record VariantLite(UUID id, String label, int finalPrice, int stock, boolean inStock, boolean active) {
    }

    public record ProductLite(UUID id, LocalizedName name, boolean active, boolean archived, List<VariantLite> variants) {
    }

    public record PackLite(UUID id, LocalizedName name, int price, boolean active, boolean archived,
                           boolean inStock, int availableUnits) {
    }

    @GetMapping("/products")
    public List<ProductLite> products() {
        return products.listAdmin(null, false).stream()
                .map(p -> new ProductLite(p.id(), p.name(), p.active(), p.archived(),
                        p.variants().stream()
                                .map(v -> new VariantLite(v.id(), v.label(), v.finalPrice(), v.stock(), v.inStock(), v.active()))
                                .toList()))
                .toList();
    }

    @GetMapping("/packs")
    public List<PackLite> packs() {
        return packs.listAdmin(false).stream()
                .map(p -> new PackLite(p.id(), p.name(), p.price(), p.active(), p.archived(), p.inStock(), p.availableUnits()))
                .toList();
    }
}
