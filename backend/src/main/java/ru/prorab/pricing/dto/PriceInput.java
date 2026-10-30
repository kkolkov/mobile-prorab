package ru.prorab.pricing.dto;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
public record PriceInput(
 Long version,
 @NotNull @DecimalMin("0.01") @DecimalMax("99999999.99") @Digits(integer=8,fraction=2) BigDecimal unitPriceRub,
 @NotNull @DecimalMin("0") @DecimalMax("1") @Digits(integer=1,fraction=4) BigDecimal roughShare,
 @NotNull @DecimalMin("0") @DecimalMax("1") @Digits(integer=1,fraction=4) BigDecimal laborShare,
 @NotBlank @Size(max=4000) String sourceNote,
 @NotNull @PastOrPresent LocalDate priceDate,
 @AssertTrue(message="Подтвердите проверку цены по указанному источнику") boolean verified,
 String category,String subcategory,String status, @Size(max=255) String name
) {}
