package ru.prorab.pricing.dto;
import java.math.BigDecimal;
import java.time.LocalDate;
public record PriceRow(String code,String title,String unit,BigDecimal unitPriceRub,
 BigDecimal roughShare,BigDecimal laborShare,String sourceNote,LocalDate priceDate,boolean verified,long version) {}
