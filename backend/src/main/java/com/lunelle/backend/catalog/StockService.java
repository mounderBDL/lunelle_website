package com.lunelle.backend.catalog;

import com.lunelle.backend.catalog.CatalogDtos.StockMovementDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StockService {

    private final VariantRepository variants;
    private final StockMovementRepository movements;

    /**
     * The ONLY way to change stock after creation. Atomic and logged.
     * Throws 409 if the stock would go below zero. Returns the new stock.
     * Orders (next sessions) call this with negative deltas.
     */
    @Transactional
    public int change(UUID variantId, int delta, StockReason reason, UUID orderId, UUID adminId, String note) {
        if (delta == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity change cannot be zero");
        }
        int updated = variants.adjustStock(variantId, delta);
        if (updated == 0) {
            if (!variants.existsById(variantId)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown size");
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient stock");
        }
        int after = variants.findStock(variantId);
        save(variantId, delta, after, reason, orderId, adminId, note);
        return after;
    }

    /** Admin screen: only RESTOCK (positive) and ADJUSTMENT (any sign) are allowed. */
    @Transactional
    public int adminChange(UUID variantId, int delta, StockReason reason, UUID adminId, String note) {
        if (reason != StockReason.RESTOCK && reason != StockReason.ADJUSTMENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reason must be RESTOCK or ADJUSTMENT");
        }
        if (reason == StockReason.RESTOCK && delta <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A restock must be a positive quantity");
        }
        return change(variantId, delta, reason, null, adminId, TextUtil.blankToNull(note));
    }

    /** Logs the stock a variant was created with (the column was already written on insert). */
    @Transactional
    public void recordInitial(UUID variantId, int quantity, UUID adminId) {
        if (quantity > 0) {
            save(variantId, quantity, quantity, StockReason.INITIAL, null, adminId, null);
        }
    }

    @Transactional(readOnly = true)
    public List<StockMovementDto> history(UUID variantId) {
        if (!variants.existsById(variantId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown size");
        }
        return movements.findTop100ByVariantIdOrderByCreatedAtDesc(variantId).stream()
                .map(m -> new StockMovementDto(m.getId(), m.getDelta(), m.getStockAfter(),
                        m.getReason(), m.getOrderId(), m.getNote(), m.getCreatedAt()))
                .toList();
    }

    private void save(UUID variantId, int delta, int after, StockReason reason,
                      UUID orderId, UUID adminId, String note) {
        StockMovement m = new StockMovement();
        m.setVariantId(variantId);
        m.setDelta(delta);
        m.setStockAfter(after);
        m.setReason(reason);
        m.setOrderId(orderId);
        m.setAdminId(adminId);
        m.setNote(note);
        movements.save(m);
    }
}