package ru.prorab.pricing.dto;
import java.math.BigDecimal;
import java.time.LocalDate;
public record TimeNormRow(String code,String title,BigDecimal personHoursPer100m2,String sourceNote,LocalDate sourceDate,long version){}
