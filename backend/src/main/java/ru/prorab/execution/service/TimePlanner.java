package ru.prorab.execution.service;
import java.math.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.stereotype.Component;
import ru.prorab.execution.model.TimePlan;
import ru.prorab.pricing.dto.CostDetails;
import ru.prorab.pricing.dto.TimeNormRow;
import ru.prorab.pricing.service.TimeNormCatalog;
import ru.prorab.refinement.model.RefinementData;

/** Person-hours from the supplied workbook; unsupported operations and curing remain explicit estimates. */
@Component
public final class TimePlanner {
 private final TimeNormCatalog catalog;
 public TimePlanner(TimeNormCatalog catalog){this.catalog=catalog;}
 private static final Set<String> ROUGH=Set.of("plaster_wall","plaster_ceiling","plaster_slope","screed","screed_semi","waterproof");
 private static final Set<String> LEGACY=Set.of("floor","wall","ceiling","preparation","demolition","electrical","plumbing","joinery","equipment","glazing");
 public TimePlan calculate(RefinementData d,CostDetails costs){
  Map<String,TimeNormRow> norms=new TreeMap<>();for(var n:catalog.list())norms.put(n.code(),n);
  Map<String,BigDecimal> quantities=new TreeMap<>();
  Map<String,Set<String>> unknown=new TreeMap<>();
  boolean preparation=false;
  for(var line:costs.lines()){
   String code=line.priceCode();
   if(code.startsWith("average.work.")){
    String op=code.substring("average.work.".length());
    if(!norms.containsKey(op))throw new IllegalStateException("Missing time norm: "+op);
    if(!line.unit().equals("м²"))throw new IllegalStateException("Time norm unit mismatch: "+op);
    quantities.merge(op,line.quantity(),BigDecimal::add);
    if(Set.of("plaster_wall","plaster_ceiling","screed","screed_semi").contains(op))preparation=true;
   }else if(code.startsWith("ref.L_")||LEGACY.contains(code)){
    String phase=code.startsWith("ref.L_demo_")||Set.of("preparation","demolition","electrical","plumbing").contains(code)?"rough":
      code.startsWith("ref.L_door_")||code.startsWith("ref.L_kitchen_")||Set.of("joinery","equipment").contains(code)?"assembly":"finishing";
    unknown.computeIfAbsent(phase,k->new TreeSet<>()).add(line.name().replaceFirst("^.*?:\\s*", ""));
    if(code.equals("preparation"))preparation=true;
   }
  }
  var workloads=new ArrayList<TimePlan.Workload>();Map<String,BigDecimal> hours=new HashMap<>();
  for(var q:quantities.entrySet()){
   var n=norms.get(q.getKey());String phase=ROUGH.contains(q.getKey())?"rough":"finishing";
   BigDecimal h=q.getValue().multiply(n.personHoursPer100m2()).divide(new BigDecimal("100"));
   hours.merge(phase,h,BigDecimal::add);
   workloads.add(new TimePlan.Workload(n.code(),n.title(),phase,q.getValue(),n.personHoursPer100m2(),h,n.sourceNote(),n.sourceDate()));
  }
  var notes=new ArrayList<String>();
  notes.add("Нормы из Сроки.xlsx: человеко-часы на 100 м² фактически включённой работы. Трудозатраты = объём × норма / 100. Материалы не добавляют время второй раз; цены и коэффициенты стоимости не умножают трудозатраты.");
  notes.add("Бригада: 2 человека по 8 часов. Рабочие дни = сумма человеко-часов / 16; ориентировочные календарные дни этапа = округление вверх рабочих дней × 7/5. Это условная пятидневка без учёта праздников и даты старта, а не точный производственный календарь.");
  notes.add("Нормы времени одинаковы для всех 16 городов. Использованы точные человеко-часы из столбца D, а не округлённые дни из C. Этапы идут последовательно, параллельные бригады не предполагаются.");
  var phases=new ArrayList<TimePlan.Phase>();BigDecimal area=d.apartment().areaM2();
  int rough=phaseDays("rough",hours,unknown,days(area,"0.2",5),notes);
  if(rough>0)add(phases,"rough","Черновые работы и коммуникации",rough);
  if(preparation){add(phases,"drying","Технологическая пауза",8);notes.add("Технологическая пауза 8 календарных дней сохранена как прежнее допущение: файл исключает сушку и набор прочности. Фактическая готовность определяется материалами и условиями; 8 дней не являются нормативом готовности стяжки.");}
  int finishing=phaseDays("finishing",hours,unknown,days(area,"0.3",7),notes);
  if(finishing>0)add(phases,"finishing","Чистовая отделка",finishing);
  // Finishing installation and cleanup have no supplied time norms.
  unknown.computeIfAbsent("assembly",k->new TreeSet<>()).add("уборка");
  add(phases,"assembly","Финишный монтаж и уборка",phaseDays("assembly",hours,unknown,4,notes));
  notes.add("Верхняя граница срока — нижняя ×1,2 с округлением вверх: прежний оценочный запас, не доверительный интервал. Доставка и ожидание поставок не нормированы.");
  return new TimePlan(version(norms),phases.stream().mapToInt(TimePlan.Phase::durationDays).sum(),List.copyOf(phases),List.copyOf(workloads),List.copyOf(notes));
 }
 private static int phaseDays(String phase,Map<String,BigDecimal> hours,Map<String,Set<String>> unknown,int fallback,List<String> notes){
  BigDecimal h=hours.getOrDefault(phase,BigDecimal.ZERO);
  int known=h.multiply(new BigDecimal("7")).divide(new BigDecimal("80"),0,RoundingMode.CEILING).intValueExact();
  if(unknown.containsKey(phase)){
   notes.add("Этап "+switch(phase){case "rough"->"«Черновые работы»";case "finishing"->"«Чистовая отделка»";default->"«Финишный монтаж»";}+": нет норм для "+String.join(", ",unknown.get(phase))+". Срок этапа = максимум нормативно рассчитанной части ("+known+" дн.) и прежнего ориентира этапа ("+fallback+" дн.). Это смешанная оценка, не полный норматив времени всех работ.");
   return Math.max(known,fallback);
  }
  return known;
 }
 private static String version(Map<String,TimeNormRow> norms){
  try{return "phases-2-"+HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(norms.toString().getBytes(StandardCharsets.UTF_8))).substring(0,12);}
  catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
 }
 private static int days(BigDecimal area,String rate,int base){return area.multiply(new BigDecimal(rate)).add(BigDecimal.valueOf(base)).setScale(0,RoundingMode.CEILING).intValueExact();}
 private static void add(List<TimePlan.Phase> p,String id,String title,int days){p.add(new TimePlan.Phase(id,title,days,p.isEmpty()?List.of():List.of(p.getLast().id())));}
}
