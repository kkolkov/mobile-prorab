package ru.prorab.execution;
import org.junit.jupiter.api.Test;
import ru.prorab.execution.service.TimePlanner;
import ru.prorab.pricing.service.TimeNormCatalog;
import ru.prorab.pricing.dto.*;
import ru.prorab.refinement.model.RefinementData;
import ru.prorab.project.model.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class TimePlannerTest {
 TimeNormCatalog catalog=mock(TimeNormCatalog.class);
 TimePlanner planner=new TimePlanner(catalog);
 RefinementData input(){return new RefinementData(new RefinementData.Apartment(CurrentState.WHITE_BOX,TargetState.FINISH_ONLY,FinishLevel.BUDGET,new BigDecimal("64"),null,"unknown","unknown","unknown","unknown","unknown","unknown","unknown","unknown"),List.of(),false,Map.of(),new RefinementData.Exteriors("none",RefinementData.Exterior.defaults(),RefinementData.Exterior.defaults()),Set.of());}
 TimeNormRow norm(String code,String hours){return new TimeNormRow(code,code,new BigDecimal(hours),"Сроки.xlsx",LocalDate.of(2026,10,28),0);}
 CostDetails.Line line(String code,String quantity){return new CostDetails.Line("repair",code,code,"м²",new BigDecimal(quantity),BigDecimal.TEN,BigDecimal.ONE,BigDecimal.TEN,"test",LocalDate.of(2026,10,28));}
 CostDetails costs(CostDetails.Line... lines){return new CostDetails(BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO,List.of(lines));}
 @Test void oldPersistedTimePlanRemainsReadable()throws Exception{
  var old=new com.fasterxml.jackson.databind.ObjectMapper().readValue("{\"version\":\"phases-1\",\"totalDays\":4,\"phases\":[{\"id\":\"assembly\",\"title\":\"Монтаж\",\"durationDays\":4,\"dependencies\":[]}]}",ru.prorab.execution.model.TimePlan.class);
  assertEquals(4,old.totalDays());assertEquals("phases-1",old.version());assertTrue(old.workloads().isEmpty());assertTrue(old.assumptions().isEmpty());
 }
 @Test void usesExactPersonHoursAndCountsOnlyWorkNotMaterials(){
  when(catalog.list()).thenReturn(List.of(norm("wallpaper","45.79")));
  var plan=planner.calculate(input(),costs(line("average.work.wallpaper","100"),line("average.material.wallpaper","100")));
  assertEquals(1,plan.workloads().size());assertEquals(0,new BigDecimal("45.79").compareTo(plan.workloads().getFirst().personHours()));
  assertEquals(5,plan.phases().getFirst().durationDays()); // ceil(45.79 / 16 * 7 / 5)
  assertEquals(9,plan.totalDays()); // plus explicitly estimated installation/cleanup
 }
 @Test void aggregatesRoomsAndOperationsBeforeRoundingPhaseDays(){
  when(catalog.list()).thenReturn(List.of(norm("tile_wall","115.26"),norm("tile_floor","119.78")));
  var plan=planner.calculate(input(),costs(line("average.work.tile_wall","40"),line("average.work.tile_wall","60"),line("average.work.tile_floor","100")));
  assertEquals(2,plan.workloads().size());assertEquals(21,plan.phases().getFirst().durationDays());
  assertEquals(25,plan.totalDays());
 }
 @Test void missingUsedNormFailsAndExcludedOperationAddsNeitherLaborNorPause(){
  when(catalog.list()).thenReturn(List.of());
  assertThrows(IllegalStateException.class,()->planner.calculate(input(),costs(line("average.work.screed","100"))));
  var plan=planner.calculate(input(),costs());assertEquals(4,plan.totalDays());assertTrue(plan.phases().stream().noneMatch(p->p.id().equals("drying")));
 }
 @Test void curingIsSeparateAndUncoveredWorkKeepsAnExplicitEstimate(){
  when(catalog.list()).thenReturn(List.of(norm("screed","38.24")));
  var plan=planner.calculate(input(),costs(line("average.work.screed","100"),line("electrical","10")));
  assertEquals(18,plan.phases().getFirst().durationDays()); // max(4 known calendar days, ceil(64*.2+5))
  assertEquals(8,plan.phases().stream().filter(p->p.id().equals("drying")).findFirst().orElseThrow().durationDays());
  assertTrue(plan.assumptions().stream().anyMatch(n->n.contains("смешанная оценка")));
 }
 @Test void updatingNormChangesNewPlanOnlyAndDoesNotUseMoneyAsTime(){
  when(catalog.list()).thenReturn(List.of(norm("wallpaper","45.79")));
  var original=planner.calculate(input(),costs(line("average.work.wallpaper","100")));
  when(catalog.list()).thenReturn(List.of(norm("wallpaper","100")));
  var updated=planner.calculate(input(),costs(line("average.work.wallpaper","100")));
  assertEquals(9,original.totalDays());assertEquals(13,updated.totalDays());assertNotEquals(original.version(),updated.version());
  var expensive=new CostDetails.Line("repair","wallpaper","average.work.wallpaper","м²",new BigDecimal("100"),new BigDecimal("99999"),new BigDecimal("1.7"),new BigDecimal("16999830"),"test",LocalDate.of(2026,10,28));
  assertEquals(updated,planner.calculate(input(),costs(expensive)));
 }
 @Test void catalogEngineeringHasRoughAndAssemblyPhasesWithoutInventedWorkloads(){
  when(catalog.list()).thenReturn(List.of());
  var plan=planner.calculate(input(),costs(line("ref.L_cable","128"),line("ref.L_pipe_water","20"),line("ref.L_wc","1"),line("ref.L_socket_dry","16"),line("ref.E_cable_socket","2")));
  assertEquals(List.of("rough","assembly"),plan.phases().stream().map(p->p.id()).toList());
  assertEquals(18,plan.phases().getFirst().durationDays());assertEquals(4,plan.phases().getLast().durationDays());
  assertTrue(plan.workloads().isEmpty());assertTrue(plan.version().startsWith("phases-4-"));
 }
 @Test void spbInstalledServicesAffectScheduleButCabinetMaterialDoesNot(){
  when(catalog.list()).thenReturn(List.of());
  var plan=planner.calculate(input(),costs(line("spb.glazing.warm","5"),line("spb.insulation.wall50","20"),line("spb.kitchen.plastic","3"),line("spb.kitchen.assembly","3")));
  assertEquals(List.of("rough","assembly"),plan.phases().stream().map(p->p.id()).toList());
  assertTrue(plan.assumptions().stream().noneMatch(n->n.contains("spb.kitchen.plastic")));
 }
}
