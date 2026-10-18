package ru.prorab.project.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record CreateDraftRequest(
        @DecimalMin(value = "0.1") @DecimalMax(value = "1000") @NotNull BigDecimal areaM2,
        @Size(max = 250) String address,
        @Size(max = 100) String name
) {}
