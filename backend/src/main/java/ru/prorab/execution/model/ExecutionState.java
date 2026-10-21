package ru.prorab.execution.model;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import ru.prorab.refinement.dto.RefinedEstimate;
public record ExecutionState(RefinedEstimate budget,LocalDate startDate,List<Task> tasks,List<Expense> expenses,List<Event> history) {
 public record Task(String id,String title,int durationDays,LocalDate baselineStart,LocalDate baselineEnd,LocalDate startDate,LocalDate endDate,String status,LocalDate completedDate,List<String> dependencies){}
 public record Expense(UUID id,String title,BigDecimal amount,String category,LocalDate date,String taskId){}
 public record Event(Instant at,String message){}
}
