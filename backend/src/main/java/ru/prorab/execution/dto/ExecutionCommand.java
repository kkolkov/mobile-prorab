package ru.prorab.execution.dto;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
public record ExecutionCommand(@NotNull Long version,UUID estimateId,UUID expenseId,@Size(max=160) String title,
 @DecimalMin("0.01") @DecimalMax("999999999") @Digits(integer=9,fraction=2) BigDecimal amount,
 String category,LocalDate date,String taskId,@Min(1) @Max(365) Integer days,@Size(max=500) String reason){}
