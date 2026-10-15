package com.lunelle.backend.common.response;

import java.util.List;

public record ApiErrorResponse(ErrorBody error) {

    public record ErrorBody(
            String code,
            String message,
            List<String> details
    ) {
    }
}
