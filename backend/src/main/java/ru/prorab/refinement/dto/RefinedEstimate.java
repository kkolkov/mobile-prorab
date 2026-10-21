package ru.prorab.refinement.dto;
import java.math.BigDecimal;
import java.util.*;

public record RefinedEstimate(UUID id, long revision, boolean demonstration, String pricingVersion,
        String algorithmVersion, String normsVersion, Totals repair, Totals kitchen, Totals total,
        BigDecimal balconyIncluded, BigDecimal loggiaIncluded, Integer durationMinDays,
        Integer durationMaxDays, List<String> reasons, List<String> assumptions, ru.prorab.pricing.dto.CostDetails details, ru.prorab.execution.model.TimePlan timePlan) {
    public record Totals(BigDecimal min, BigDecimal max, BigDecimal expected, BigDecimal withReserve) {}
}
