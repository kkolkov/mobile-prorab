package ru.prorab.execution.model;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
public record TimePlan(String version,int totalDays,List<Phase> phases,List<Workload> workloads,List<String> assumptions) {
 public TimePlan {workloads=workloads==null?List.of():List.copyOf(workloads);assumptions=assumptions==null?List.of():List.copyOf(assumptions);}
 public TimePlan(String version,int totalDays,List<Phase> phases){this(version,totalDays,phases,List.of(),List.of());}
 public record Phase(String id,String title,int durationDays,List<String> dependencies) {}
 public record Workload(String code,String title,String phase,BigDecimal quantityM2,BigDecimal personHoursPer100m2,BigDecimal personHours,String source,LocalDate sourceDate){}
}
