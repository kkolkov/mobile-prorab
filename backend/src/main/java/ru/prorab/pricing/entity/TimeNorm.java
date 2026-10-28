package ru.prorab.pricing.entity;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
@Entity @Table(name="time_norms")
public class TimeNorm {
 @Id private String code;
 private String title;
 @Column(name="person_hours_per100m2") private BigDecimal personHoursPer100m2;
 private String sourceNote;
 private LocalDate sourceDate;
 @Version private Long version;
 protected TimeNorm(){}
 public String getCode(){return code;}
 public String getTitle(){return title;}
 public BigDecimal getPersonHoursPer100m2(){return personHoursPer100m2;}
 public String getSourceNote(){return sourceNote;}
 public LocalDate getSourceDate(){return sourceDate;}
 public long getVersion(){return version;}
 public void update(BigDecimal hours,String source,LocalDate date){personHoursPer100m2=hours;sourceNote=source;sourceDate=date;}
}
