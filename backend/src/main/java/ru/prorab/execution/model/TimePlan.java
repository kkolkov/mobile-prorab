package ru.prorab.execution.model;
import java.util.List;
public record TimePlan(String version,int totalDays,List<Phase> phases) {
 public record Phase(String id,String title,int durationDays,List<String> dependencies) {}
}
