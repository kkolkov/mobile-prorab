package ru.prorab.execution.service;
import java.math.*;
import java.util.*;
import ru.prorab.execution.model.TimePlan;
import ru.prorab.pricing.dto.CostDetails;
import ru.prorab.refinement.model.RefinementData;
/** Provisional calendar-day phase model from gant_tracker.docx; not construction safety guidance. */
public final class TimePlanner {
 private TimePlanner(){}
 public static TimePlan calculate(RefinementData d,CostDetails costs){
  var phases=new ArrayList<TimePlan.Phase>();
  var codes=new HashSet<String>();costs.lines().forEach(l->codes.add(l.priceCode()));
  BigDecimal area=d.apartment().areaM2();
  boolean rough=codes.stream().anyMatch(Set.of("preparation","demolition","electrical")::contains);
  if(rough)add(phases,"rough","Черновые работы и коммуникации",days(area,"0.2",5));
  if(codes.contains("preparation"))add(phases,"drying","Технологическая пауза",8);
  add(phases,"finishing","Чистовая отделка",days(area,"0.3",7));
  add(phases,"assembly","Финишный монтаж и уборка",4);
  return new TimePlan("phases-1",phases.stream().mapToInt(TimePlan.Phase::durationDays).sum(),List.copyOf(phases));
 }
 private static int days(BigDecimal area,String rate,int base){return area.multiply(new BigDecimal(rate)).add(BigDecimal.valueOf(base)).setScale(0,RoundingMode.CEILING).intValueExact();}
 private static void add(List<TimePlan.Phase> p,String id,String title,int days){p.add(new TimePlan.Phase(id,title,days,p.isEmpty()?List.of():List.of(p.getLast().id())));}
}
