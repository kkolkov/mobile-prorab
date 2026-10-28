package ru.prorab.pricing.dto;
import java.math.BigDecimal;
import java.time.LocalDate;
import jakarta.validation.constraints.*;
public record TimeNormInput(@NotNull Long version,
 @NotNull @DecimalMin("0.0001") @DecimalMax("99999999") @Digits(integer=8,fraction=4) BigDecimal personHoursPer100m2,
 @NotBlank @Size(max=4000) String sourceNote,@NotNull @PastOrPresent LocalDate sourceDate){}
