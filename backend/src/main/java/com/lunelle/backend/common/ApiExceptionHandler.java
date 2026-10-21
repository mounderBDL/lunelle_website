package com.lunelle.backend.common;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class ApiExceptionHandler {

    /** Our own, intentional errors (stock, rules, not found...): always {"message": "..."}. */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> status(ResponseStatusException e) {
        String message = e.getReason() != null ? e.getReason() : "Request failed";
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", message));
    }

    /** Duplicate value, or deleting something still referenced (e.g. a size inside a pack). */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> conflict(DataIntegrityViolationException e) {
        String cause = String.valueOf(e.getMostSpecificCause().getMessage());
        log.warn("Data integrity violation: {}", cause);

        String message;
        if (cause.contains("product_variant_sku_key")) {
            message = "This SKU is already used by another size";
        } else if (cause.contains("violates foreign key constraint")) {
            message = "This item is still in use and cannot be deleted";
        } else {
            message = "Conflict: duplicate value";
        }
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", message));
    }

    /** A field failed validation (e.g. price missing, quantity out of range). */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> invalid(MethodArgumentNotValidException e) {
        Map<String, String> fields = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors()
                .forEach(fe -> fields.putIfAbsent(fe.getField(), fe.getDefaultMessage()));
        log.warn("Validation failed: {}", fields);
        return ResponseEntity.badRequest().body(Map.of("message", "Validation failed", "fields", fields));
    }

    /** Validation of nested items in a list (Spring's method validation). */
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<Map<String, Object>> methodInvalid(HandlerMethodValidationException e) {
        List<String> errors = e.getAllErrors().stream()
                .map(MessageSourceResolvable::getDefaultMessage)
                .toList();
        log.warn("Validation failed: {}", errors);
        return ResponseEntity.badRequest().body(Map.of("message", "Validation failed", "errors", errors));
    }

    /** The body is not valid JSON, or a value has the wrong type (e.g. a malformed UUID). */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> unreadable(HttpMessageNotReadableException e) {
        log.warn("Unreadable request body: {}", e.getMostSpecificCause().getMessage());
        return ResponseEntity.badRequest()
                .body(Map.of("message", "The request body is not valid JSON, or a value has the wrong type"));
    }
}