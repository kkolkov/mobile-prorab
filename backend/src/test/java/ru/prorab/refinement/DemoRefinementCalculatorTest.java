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

class DemoRefinementCalculatorTest {
    final UUID project=UUID.randomUUID(),kitchenId=UUID.randomUUID();
    RefinementData data(Kitchen kitchen,Exteriors exterior){
        var a=new Apartment(CurrentState.OLD_FINISH,TargetState.MOVE_IN_READY,FinishLevel.COMFORT,new BigDecimal("68"),null,"unknown","unknown","unknown","unknown","unknown","unknown","unknown","unknown");
        return new RefinementData(a,List.of(new Room(UUID.randomUUID(),"living","Комната",new BigDecimal("56"),"inherit","inherit","inherit",true),new Room(kitchenId,"kitchen","Кухня",new BigDecimal("12"),"inherit","inherit","inherit",true)),false,Map.of(kitchenId,kitchen),exterior,Set.of());
    }
    RefinedEstimate calc(RefinementData d){return new DemoRefinementCalculator().calculate(UUID.randomUUID(),1,d,new AreaAllocator().allocate(project,d.apartment().areaM2(),d.rooms()));}
    Exteriors none(){return new Exteriors("none",Exterior.defaults(),Exterior.defaults());}
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
