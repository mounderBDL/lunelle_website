package com.lunelle.backend.catalog;

import com.lunelle.backend.catalog.CatalogDtos.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Products (admin)")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminCatalogController {

    private final ProductService products;
    private final StockService stock;

    // ───── products ─────
    @GetMapping("/products")
    public List<AdminProductDto> list(@RequestParam(required = false) UUID categoryId,
                                      @RequestParam(defaultValue = "false") boolean includeArchived) {
        return products.listAdmin(categoryId, includeArchived);
    }

    @GetMapping("/products/{id}")
    public AdminProductDto get(@PathVariable UUID id) {
        return products.getAdmin(id);
    }

    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminProductDto create(@Valid @RequestBody CreateProductRequest request,
                                  @AuthenticationPrincipal Jwt jwt) {
        return products.create(request, adminId(jwt));
    }

    @PutMapping("/products/{id}")
    public AdminProductDto update(@PathVariable UUID id, @Valid @RequestBody UpdateProductRequest request) {
        return products.update(id, request);
    }

    @PutMapping("/products/{id}/discount")
    public AdminProductDto discount(@PathVariable UUID id, @Valid @RequestBody DiscountRequest request) {
        return products.setDiscount(id, request);
    }

    /** Archives the product (it is never physically deleted). */
    @DeleteMapping("/products/{id}")
    public AdminProductDto archive(@PathVariable UUID id) {
        return products.archive(id);
    }

    @PostMapping("/products/{id}/restore")
    public AdminProductDto restore(@PathVariable UUID id) {
        return products.restore(id);
    }

    // ───── sizes (variants) ─────
    @PostMapping("/products/{id}/variants")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminProductDto addVariant(@PathVariable UUID id, @Valid @RequestBody CreateVariantRequest request,
                                      @AuthenticationPrincipal Jwt jwt) {
        return products.addVariant(id, request, adminId(jwt));
    }

    @PutMapping("/variants/{id}")
    public AdminProductDto updateVariant(@PathVariable UUID id, @Valid @RequestBody UpdateVariantRequest request) {
        return products.updateVariant(id, request);
    }

    @DeleteMapping("/variants/{id}")
    public AdminProductDto deleteVariant(@PathVariable UUID id) {
        return products.deleteVariant(id);
    }

    // ───── stock ─────
    @PostMapping("/variants/{id}/stock")
    public StockResultDto changeStock(@PathVariable UUID id, @Valid @RequestBody StockChangeRequest request,
                                      @AuthenticationPrincipal Jwt jwt) {
        int after = stock.adminChange(id, request.delta(), request.reason(), adminId(jwt), request.note());
        return new StockResultDto(id, after);
    }

    @GetMapping("/variants/{id}/movements")
    public List<StockMovementDto> movements(@PathVariable UUID id) {
        return stock.history(id);
    }

    private static UUID adminId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}