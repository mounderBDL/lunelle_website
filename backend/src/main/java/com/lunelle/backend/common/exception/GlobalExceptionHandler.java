package com.lunelle.backend.common.exception;

import com.lunelle.backend.common.response.ApiErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;


import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(
            IllegalArgumentException exception) {

        ApiErrorResponse response = new ApiErrorResponse(
                new ApiErrorResponse.ErrorBody(
                        "INVALID_REQUEST",
                        exception.getMessage(),
                        List.of()
                )
        );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(response);
    }

    
    @ExceptionHandler(ResourceConflictException.class)
    public ResponseEntity<ApiErrorResponse> handleResourceConflict(
            ResourceConflictException exception) {

        ApiErrorResponse response = new ApiErrorResponse(
                new ApiErrorResponse.ErrorBody(
                        "RESOURCE_CONFLICT",
                        exception.getMessage(),
                        List.of()
                )
        );

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(response);
    }

    
        @ExceptionHandler(ResourceNotFoundException.class)
        public ResponseEntity<ApiErrorResponse> handleResourceNotFound(
                ResourceNotFoundException exception) {

        ApiErrorResponse response = new ApiErrorResponse(
                new ApiErrorResponse.ErrorBody(
                "RESOURCE_NOT_FOUND",
                exception.getMessage(),
                List.of()
                )
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
}