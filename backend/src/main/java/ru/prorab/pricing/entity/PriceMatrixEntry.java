package ru.prorab.pricing.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name="price_matrix")
public class PriceMatrixEntry {
    @Id private String code;
    private String title;
    private String unit;
    private BigDecimal unitPriceRub;
    private BigDecimal roughShare;
    private BigDecimal laborShare;
    private String sourceNote;
    private LocalDate priceDate;
    protected PriceMatrixEntry() {}
    public String getCode(){return code;}
    public String getTitle(){return title;}
    public String getUnit(){return unit;}
    public BigDecimal getUnitPriceRub(){return unitPriceRub;}
    public BigDecimal getRoughShare(){return roughShare;}
    public BigDecimal getLaborShare(){return laborShare;}
    public String getSourceNote(){return sourceNote;}
    public LocalDate getPriceDate(){return priceDate;}
}
