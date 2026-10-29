package ru.prorab.pricing.dto;
import java.math.BigDecimal;
public record CoefficientRow(String code,String title,String description,BigDecimal value,BigDecimal minimum,BigDecimal maximum,long version){}
