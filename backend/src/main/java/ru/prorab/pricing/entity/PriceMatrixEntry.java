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
    @Version private Long version;
    private boolean verified;
    private String category;
    private String subcategory;
    private boolean deleted;
    public String getCategory(){return category;}
    public String getSubcategory(){return subcategory;}
    public boolean isDeleted(){return deleted;}
    public void setDeleted(boolean value){deleted=value;}
    public void classify(String category,String subcategory){this.category=category;this.subcategory=subcategory;}
    public long getVersion(){return version==null?0:version;}
    public boolean isVerified(){return verified;}
    protected PriceMatrixEntry() {}
    public PriceMatrixEntry(String code,String title,String unit){this.code=code;this.title=title;this.unit=unit;}
    public void update(BigDecimal price,BigDecimal rough,BigDecimal labor,String source,LocalDate date,boolean verified){
        unitPriceRub=price;roughShare=rough;laborShare=labor;sourceNote=source;priceDate=date;this.verified=verified;
    }
    public String getCode(){return code;}
    public String getTitle(){return title;}
    public void rename(String title){this.title=title;}
    public String getUnit(){return unit;}
    public BigDecimal getUnitPriceRub(){return unitPriceRub;}
    public BigDecimal getRoughShare(){return roughShare;}
    public BigDecimal getLaborShare(){return laborShare;}
    public String getSourceNote(){return sourceNote;}
    public LocalDate getPriceDate(){return priceDate;}
}
