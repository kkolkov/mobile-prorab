package ru.prorab.refinement;
import org.junit.jupiter.api.Test;
import ru.prorab.refinement.model.RefinementData;
import ru.prorab.refinement.model.RefinementData.*;
import ru.prorab.refinement.service.*;
import ru.prorab.refinement.dto.RefinedEstimate;
import ru.prorab.project.model.*;
import java.util.*;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

@org.springframework.boot.test.context.SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:pricing;MODE=PostgreSQL;DB_CLOSE_DELAY=-1","spring.datasource.driver-class-name=org.h2.Driver","spring.datasource.username=sa","spring.datasource.password="})
@org.springframework.transaction.annotation.Transactional
class UnitPriceCalculatorTest {
    @org.springframework.beans.factory.annotation.Autowired ru.prorab.pricing.service.UnitPriceCalculator calculator;
    @org.springframework.beans.factory.annotation.Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    @org.springframework.beans.factory.annotation.Autowired jakarta.persistence.EntityManager entityManager;
    @org.springframework.beans.factory.annotation.Autowired ru.prorab.estimate.service.EstimateService initial;
    @org.springframework.beans.factory.annotation.Autowired ru.prorab.refinement.service.InitialRefinementData inputs;
    final UUID project=UUID.randomUUID(),kitchenId=UUID.randomUUID();
    RefinementData data(Kitchen kitchen,Exteriors exterior){
        var a=new Apartment(CurrentState.OLD_FINISH,TargetState.MOVE_IN_READY,FinishLevel.COMFORT,new BigDecimal("68"),null,"unknown","unknown","unknown","unknown","unknown","unknown","unknown","unknown");
        return new RefinementData(a,List.of(new Room(UUID.randomUUID(),"living","Комната",new BigDecimal("56"),"inherit","inherit","inherit",true),new Room(kitchenId,"kitchen","Кухня",new BigDecimal("12"),"inherit","inherit","inherit",true)),false,Map.of(kitchenId,kitchen),exterior,Set.of());
    }
    RefinedEstimate calc(RefinementData d){return calculator.calculate(UUID.randomUUID(),1,d,new AreaAllocator().allocate(project,d.apartment().areaM2(),d.rooms()));}
    Exteriors none(){return new Exteriors("none",Exterior.defaults(),Exterior.defaults());}
    @Test void lineItemsReproduceTotalAndSplitExactly(){
        var result=calc(data(Kitchen.defaults(),none()));
        BigDecimal sum=BigDecimal.ZERO;
        for(var line:result.details().lines()){
            assertEquals(line.amountRub(),line.quantity().multiply(line.unitPriceRub()).multiply(line.coefficient()).setScale(0,java.math.RoundingMode.HALF_UP));
            sum=sum.add(line.amountRub());
        }
        assertEquals(result.total().expected(),sum);
        assertEquals(sum,result.details().roughMaterials().add(result.details().finishMaterials()).add(result.details().labor()));
        var wall=result.details().lines().stream().filter(l->l.name().equals("Комната: стены")).findFirst().orElseThrow();
        assertEquals(new BigDecimal("56").sqrt(java.math.MathContext.DECIMAL64).multiply(new BigDecimal("4")).multiply(new BigDecimal("2.7")).multiply(new BigDecimal("0.85")).setScale(4,java.math.RoundingMode.HALF_UP),wall.quantity());
    }
    @Test void bathroomWallsDefaultToTileButExplicitMaterialWins(){
        var a=data(Kitchen.defaults(),none()).apartment();
        for(String type:List.of("combined_bathroom","bathroom","toilet")){
            for(String wall:List.of("inherit","unknown","paint")){
                var rooms=List.of(
                    new Room(UUID.randomUUID(),type,"Санузел",new BigDecimal("4"),"inherit",wall,"inherit",true),
                    new Room(UUID.randomUUID(),"living","Комната",new BigDecimal("64"),"inherit","inherit","inherit",true));
                var result=calc(new RefinementData(a,rooms,false,Map.of(),none(),Set.of()));
                var line=result.details().lines().stream().filter(l->l.name().equals("Санузел: стены")).findFirst().orElseThrow();
                // Comfort 1.3 × tile 1.6 or explicitly selected paint 1.2.
                assertEquals(0,line.coefficient().compareTo(new BigDecimal(wall.equals("paint")?"1.56":"2.08")),type+" / "+wall);
                var living=result.details().lines().stream().filter(l->l.name().equals("Комната: стены")).findFirst().orElseThrow();
                assertEquals(0,living.coefficient().compareTo(new BigDecimal("1.3")));
            }
        }
    }
    @Test void reserveIsTenPercentAboveRoundedMaximumIncludingEmptyKitchen(){
        var result=calc(data(new Kitchen("keep",null,"unknown","unknown","none",false,false,false,false),none()));
        for(var totals:List.of(result.total(),result.repair(),result.kitchen())){
            assertEquals(totals.max().multiply(new BigDecimal("1.10")).setScale(0,java.math.RoundingMode.HALF_UP),totals.withReserve());
            assertTrue(totals.withReserve().compareTo(totals.max())>=0);
        }
        assertEquals(0,result.kitchen().withReserve().signum());
    }
    @Test void databasePriceChangeAffectsOnlyNewSnapshots(){
        var input=data(Kitchen.defaults(),none());var before=calc(input);
        jdbc.update("update price_matrix set unit_price_rub=unit_price_rub*2 where code='floor'");
        entityManager.clear(); // Simulate the next request after an external catalog edit.
        var after=calc(input);
        assertTrue(after.total().expected().compareTo(before.total().expected())>0);
        assertNotEquals(before.pricingVersion(),after.pricingVersion());
        assertTrue(before.details().lines().stream().filter(l->l.priceCode().equals("floor")).allMatch(l->l.unitPriceRub().compareTo(new BigDecimal("2200"))==0));
        assertEquals(10,jdbc.queryForObject("select count(*) from price_matrix",Integer.class));
    }
    @Test void missingPriceFailsInsteadOfFallingBackToHiddenMock(){
        jdbc.update("delete from price_matrix where code='wall'");
        assertThrows(IllegalStateException.class,()->calc(data(Kitchen.defaults(),none())));
    }
    @Test void preliminaryAndRefinementUseIdenticalInputsAndEngine(){
        var p=ru.prorab.project.entity.Project.draft(new BigDecimal("68"),null,"Тест");
        p.setRoomsCount(2);p.setCurrentState(CurrentState.OLD_FINISH);p.setTargetState(TargetState.MOVE_IN_READY);p.setFinishLevel(FinishLevel.COMFORT);
        var first=initial.calculate(p);var d=inputs.from(p);
        var next=calculator.calculate(UUID.randomUUID(),0,d,new AreaAllocator().allocate(p.getProjectId(),p.getAreaM2(),d.rooms()));
        assertEquals(first.details().total(),next.total());
        assertEquals(first.details().details(),next.details());
    }
    @Test void whiteBoxSkipsDefaultPreparationAndDemolitionButExplicitWorkOverrides(){
        var d=data(Kitchen.defaults(),none());var a=d.apartment();
        var white=new Apartment(CurrentState.WHITE_BOX,a.targetState(),a.finishLevel(),a.areaM2(),null,"unknown","unknown","unknown","unknown","unknown","unknown","unknown","unknown");
        var result=calc(new RefinementData(white,d.rooms(),false,d.kitchens(),d.exteriors(),Set.of()));
        assertTrue(result.details().lines().stream().noneMatch(l->Set.of("preparation","demolition","electrical").contains(l.priceCode())));
        assertTrue(result.total().expected().compareTo(calc(d).total().expected())<0);
    }
    @Test void heightAndFinishChoiceChangeRelevantQuantitiesAndAmounts(){
        var d=data(Kitchen.defaults(),none());var a=d.apartment();
        var high=new Apartment(a.currentState(),a.targetState(),a.finishLevel(),a.areaM2(),new BigDecimal("3.5"),a.floor(),a.walls(),a.ceiling(),a.doors(),a.demolition(),a.wallPreparation(),a.floorPreparation(),a.electrical());
        var result=calc(new RefinementData(high,d.rooms(),false,d.kitchens(),d.exteriors(),Set.of()));
        assertTrue(result.total().expected().compareTo(calc(d).total().expected())>0);
        var room=d.rooms().get(0);var changed=new Room(room.id(),room.type(),room.name(),room.areaM2(),"parquet",room.walls(),room.ceiling(),room.automatic());
        var modified=calc(new RefinementData(a,List.of(changed,d.rooms().get(1)),false,d.kitchens(),d.exteriors(),Set.of()));
        assertTrue(modified.total().expected().compareTo(calc(d).total().expected())>0);
        assertEquals(calc(d).kitchen(),modified.kitchen());
    }
    @Test void targetAndClassAffectPreliminaryBudget(){
        var p=ru.prorab.project.entity.Project.draft(new BigDecimal("68"),null,"Тест");
        p.setRoomsCount(2);p.setCurrentState(CurrentState.WHITE_BOX);p.setTargetState(TargetState.FINISH_ONLY);p.setFinishLevel(FinishLevel.BUDGET);
        var finish=initial.calculate(p);assertEquals(0,finish.details().kitchen().expected().signum());
        p.setTargetState(TargetState.MOVE_IN_READY);var ready=initial.calculate(p);assertTrue(ready.budgetMaxRub()>finish.budgetMaxRub());
        p.setTargetState(TargetState.FULLY_FURNISHED);var furnished=initial.calculate(p);assertTrue(furnished.budgetMaxRub()>ready.budgetMaxRub());
        p.setFinishLevel(FinishLevel.BUSINESS);assertTrue(initial.calculate(p).budgetMaxRub()>furnished.budgetMaxRub());
    }
    @Test void cookerDoesNotDoubleChargeItsOven(){
        Kitchen withOven=new Kitchen("keep",null,"unknown","unknown","cooker",true,false,false,false);
        Kitchen withoutOven=new Kitchen("keep",null,"unknown","unknown","cooker",false,false,false,false);
        assertEquals(calc(data(withOven,none())).kitchen(),calc(data(withoutOven,none())).kitchen());
    }
    @Test void explicitRefusalExcludesEquipmentAndKeepsUnknownDistinct(){
        Kitchen refused=new Kitchen("keep",null,"unknown","unknown","none",false,false,false,false);
        assertEquals(0,calc(data(refused,none())).kitchen().expected().signum());
        assertTrue(calc(data(Kitchen.defaults(),none())).kitchen().expected().signum()>0);
    }
    @Test void exteriorCostsAreIncludedOnceAndExplicitNoDisablesWorks(){
        Exterior noWorks=new Exterior(null,"keep","no","tile","paint","none",false,false);
        Exterior yesWorks=new Exterior(null,"new","yes","tile","paint","required",true,true);
        var no=calc(data(Kitchen.defaults(),new Exteriors("both",noWorks,noWorks)));
        var yes=calc(data(Kitchen.defaults(),new Exteriors("both",yesWorks,yesWorks)));
        assertTrue(yes.repair().expected().compareTo(no.repair().expected())>0);
        assertEquals(yes.total().expected(),yes.repair().expected().add(yes.kitchen().expected()));
        assertTrue(yes.assumptions().stream().anyMatch(s->s.contains("3.0")));
        assertTrue(yes.assumptions().stream().anyMatch(s->s.contains("4.5")));
        var hidden=calc(data(Kitchen.defaults(),new Exteriors("none",yesWorks,yesWorks)));
        assertEquals(calc(data(Kitchen.defaults(),none())).total(),hidden.total());
        assertNull(yes.durationMinDays());
    }
}
