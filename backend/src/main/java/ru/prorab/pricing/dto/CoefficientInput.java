package ru.prorab.pricing.dto;
import java.math.BigDecimal;
import jakarta.validation.constraints.*;
public record CoefficientInput(@NotNull @PositiveOrZero Long version, @NotNull @DecimalMin("0") @DecimalMax("10") @Digits(integer=2,fraction=4) BigDecimal value){}
