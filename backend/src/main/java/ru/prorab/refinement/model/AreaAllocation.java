package ru.prorab.refinement.model;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
public record AreaAllocation(BigDecimal distributed, BigDecimal remaining, boolean complete,
                             boolean excessBlocked, List<Area> areas, List<String> assumptions, String normsVersion) {
    public record Area(UUID id, String type, BigDecimal areaM2, boolean inferred) {}
}
