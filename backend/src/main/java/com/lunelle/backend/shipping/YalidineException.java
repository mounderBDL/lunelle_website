package com.lunelle.backend.shipping;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** A failure talking to Yalidine, worded for the person using the studio. */
public class YalidineException extends ResponseStatusException {

    public YalidineException(HttpStatus status, String message) {
        super(status, message);
    }
}
