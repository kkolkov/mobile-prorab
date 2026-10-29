package ru.prorab.pricing.entity;
import jakarta.persistence.*;
import java.math.BigDecimal;
@Entity @Table(name="calculation_coefficients")
public class CalculationCoefficient {
 @Id private String code;
 private String title;
 private String description;
 private BigDecimal coefficientValue;
 private BigDecimal minimumValue;
 private BigDecimal maximumValue;
 @Version private Long version;
 protected CalculationCoefficient(){}
 public String getCode(){return code;}
 public String getTitle(){return title;}
 public String getDescription(){return description;}
 public BigDecimal getValue(){return coefficientValue;}
 public BigDecimal getMinimum(){return minimumValue;}
 public BigDecimal getMaximum(){return maximumValue;}
 public long getVersion(){return version;}
 public void update(BigDecimal value){coefficientValue=value;}
}
