package ru.prorab.execution.dto;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import ru.prorab.execution.model.ExecutionState;
public record ExecutionResponse(UUID projectId,long version,ExecutionState data,boolean estimateAvailable,boolean newerEstimate,boolean scheduleAvailable,
 BigDecimal planBudget,BigDecimal budgetWithReserve,BigDecimal spentTotal,BigDecimal remainingBudget,BigDecimal remainingWithReserve,
 List<Category> categories,int progressPercent,LocalDate forecastEnd,int totalDays) {
 public record Category(String code,String title,BigDecimal plan,BigDecimal spent){}
}
