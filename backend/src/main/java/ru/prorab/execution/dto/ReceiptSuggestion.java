package ru.prorab.execution.dto;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
public record ReceiptSuggestion(String title,BigDecimal amount,LocalDate date,List<String> warnings){}
