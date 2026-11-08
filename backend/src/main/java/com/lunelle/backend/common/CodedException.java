package com.lunelle.backend.common;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/** A ResponseStatusException that also carries a stable code, so the shop can show the message in its own language. */
public class CodedException extends ResponseStatusException {

    private final String code;
    private final Map<String, String> params;

    public CodedException(HttpStatus status, String code, String message) {
        this(status, code, message, Map.of());
    }

    public CodedException(HttpStatus status, String code, String message, Map<String, String> params) {
        super(status, message);
        this.code = code;
        this.params = params;
    }

    public String getCode() {
        return code;
    }

    public Map<String, String> getParams() {
        return params;
    }
}