package ru.prorab.refinement;
import ru.prorab.refinement.model.AreaAllocation;
import org.junit.jupiter.api.Test;
import ru.prorab.refinement.service.*;
import ru.prorab.refinement.model.RefinementData.Room;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class AreaAllocatorTest {
    private final AreaAllocator allocator=new AreaAllocator();
    private final UUID project=UUID.fromString("00000000-0000-0000-0000-000000000001");
    private Room room(String type,String area){return new Room(UUID.randomUUID(),type,type,area==null?null:new BigDecimal(area),"inherit","inherit","inherit",true);}
    @Test void specificationExampleDistributes33As2302And998ThenReplacesAssumption(){
        var rooms=new ArrayList<>(List.of(room("living","18"),room("kitchen","12"),room("combined_bathroom","5"),room("living",null)));
        var result=allocator.allocate(project,new BigDecimal("68"),rooms);
        assertTrue(result.complete());assertEquals(0,result.remaining().compareTo(new BigDecimal("33")));
        assertEquals(new BigDecimal("23.02"),result.areas().stream().filter(a->a.id().equals(rooms.get(3).id())).findFirst().orElseThrow().areaM2());
        assertEquals(new BigDecimal("9.98"),result.areas().stream().filter(a->a.type().equals("corridor")).findFirst().orElseThrow().areaM2());
        rooms.set(3,room("living","20"));var measured=allocator.allocate(project,new BigDecimal("68"),rooms);
        assertEquals(new BigDecimal("13.00"),measured.areas().stream().filter(a->a.type().equals("corridor")).findFirst().orElseThrow().areaM2());
        assertEquals(0,measured.areas().stream().map(AreaAllocation.Area::areaM2).reduce(BigDecimal.ZERO,BigDecimal::add).compareTo(new BigDecimal("68")));
    }
    @Test void insufficientAreaKeepsUnknownRoomAndPreventsFullCalculation(){
        var result=allocator.allocate(project,new BigDecimal("68"),List.of(room("living","63"),room("living",null)));
        assertFalse(result.complete());assertFalse(result.excessBlocked());
    }
    @Test void toleranceAllowsOnlyFullyMeasuredComposition(){
        assertTrue(allocator.allocate(project,new BigDecimal("68"),List.of(room("living","68.5"))).complete());
        assertFalse(allocator.allocate(project,new BigDecimal("68"),List.of(room("living","68.5"),room("living",null))).complete());
        assertTrue(allocator.allocate(project,new BigDecimal("68"),List.of(room("living","68.7"))).excessBlocked());
    }
    @Test void allocationIsDeterministicAndConservesAreaIncludingOverflow(){
        for(String total:List.of("45.1","68","90.3","999.9")){
            var rooms=List.of(room("living",null),room("living",null),room("kitchen",null),room("combined_bathroom",null));
            var a=allocator.allocate(project,new BigDecimal(total),rooms);
            assertTrue(a.complete());assertEquals(a,allocator.allocate(project,new BigDecimal(total),rooms));
            assertEquals(0,new BigDecimal(total).compareTo(a.areas().stream().map(AreaAllocation.Area::areaM2).reduce(BigDecimal.ZERO,BigDecimal::add)));
            assertTrue(a.areas().stream().allMatch(r->r.areaM2().signum()>0));
        }
    }
    @Test void recommendationsRespectThresholdsAndAutomaticCap(){
        String[] areas={"33","44.9","45","68","74.9","75","104.9","105","135","165","1000"};int[] expected={1,1,2,2,2,3,3,4,5,6,12};
        for(int i=0;i<areas.length;i++)assertEquals(expected[i],RefinementService.recommended(new BigDecimal(areas[i])));
    }
}
