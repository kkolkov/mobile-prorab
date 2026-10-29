package ru.prorab.pricing.dto;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Immutable calculation snapshot: quantities, prices and assumptions survive later catalog changes. */
public record CostDetails(BigDecimal roughMaterials, BigDecimal finishMaterials, BigDecimal labor,
                          List<Line> lines, List<Group> groups) {
    public CostDetails(BigDecimal roughMaterials, BigDecimal finishMaterials, BigDecimal labor,List<Line> lines){this(roughMaterials,finishMaterials,labor,lines,null);}
    public record Group(String code,String title,String description,BigDecimal laborRub,BigDecimal materialsRub,BigDecimal totalRub) {}
    public record Line(String section, String name, String priceCode, String unit,
                       BigDecimal quantity, BigDecimal unitPriceRub, BigDecimal coefficient,
                       BigDecimal amountRub, String source, LocalDate priceDate) {}
}
