package ru.prorab.common.exception;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import ru.prorab.common.dto.ErrorResponse;

import java.time.Instant;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    ResponseEntity<ErrorResponse> status(org.springframework.web.server.ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(new ErrorResponse("REQUEST_REJECTED",e.getReason(),Instant.now()));
    }
    @ExceptionHandler(ResourceNotFoundException.class)
    ResponseEntity<ErrorResponse> notFound(ResourceNotFoundException e) {
        return response(HttpStatus.NOT_FOUND, "PROJECT_NOT_FOUND", e.getMessage());
    }

    @ExceptionHandler({BusinessException.class, IllegalArgumentException.class})
    ResponseEntity<ErrorResponse> badRequest(RuntimeException e) {
        return response(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", e.getMessage());
    }

    @ExceptionHandler({ObjectOptimisticLockingFailureException.class})
    ResponseEntity<ErrorResponse> conflict(RuntimeException e) {
        return response(HttpStatus.CONFLICT, "VERSION_CONFLICT", "Проект был изменён. Обновите данные и повторите операцию.");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> validation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .findFirst().map(error -> error.getField() + ": " + error.getDefaultMessage())
                .orElse("Некорректные данные");
        return response(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ErrorResponse> constraint(ConstraintViolationException e) {
        return response(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", e.getMessage());
    }

    private ResponseEntity<ErrorResponse> response(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new ErrorResponse(code, message, Instant.now()));
    }
}
