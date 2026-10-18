package ru.prorab.refinement.service;
import ru.prorab.refinement.model.AreaAllocation;

import org.springframework.stereotype.Component;
import ru.prorab.refinement.dto.RefinedEstimate;
import ru.prorab.refinement.dto.RefinedEstimate.Totals;
import ru.prorab.refinement.model.RefinementData;
import ru.prorab.refinement.model.RefinementData.*;
import java.math.*;
import java.util.*;

/** Explicitly authorized DEMO pricing, not the missing cost module 1.2.0. Never present as real prices. */
@Component
public class DemoRefinementCalculator implements RefinementCalculator {
    public RefinedEstimate calculate(UUID id,long revision,RefinementData d,AreaAllocation allocation){
        if(!allocation.complete())throw new IllegalArgumentException("Incomplete area allocation");
        List<String> notes=new ArrayList<>(allocation.assumptions());
        notes.add("Демонстрационные цены и резерв 10%. Модуль стоимости 1.2.0 не подключён.");
        Apartment a=d.apartment();
        BigDecimal factor=new BigDecimal(switch(a.finishLevel()){case BUDGET->"0.85";case COMFORT->"1";case BUSINESS->"1.35";});
        BigDecimal repair=BigDecimal.ZERO;
        Map<UUID,Room> rooms=new HashMap<>();d.rooms().forEach(r->rooms.put(r.id(),r));
        for(var area:allocation.areas()){
            Room r=rooms.get(area.id());boolean wet=Set.of("combined_bathroom","bathroom","toilet").contains(area.type());
            boolean shared=Set.of("living","kitchen","corridor").contains(area.type());
            String floor=effective(r==null?"inherit":r.floor(),wet?"tile":shared?a.floor():"unknown");
            String wall=effective(r==null?"inherit":r.walls(),wet?"paint":shared?a.walls():"unknown");
            String ceiling=effective(r==null?"inherit":r.ceiling(),wet?"stretch":shared?a.ceiling():"unknown");
            long rate=10000+material(floor)+material(wall)+material(ceiling)+(wet?5000:0);
            rate+=work(a.demolition(),a.currentState()==ru.prorab.project.model.CurrentState.OLD_FINISH?3000:0,"none");
            rate+=work(a.wallPreparation(),2000,"ready")+work(a.floorPreparation(),2000,"ready")+work(a.electrical(),3000,"keep");
            if(!"unknown".equals(a.doors()))rate+="concealed".equals(a.doors())?1500:700;
            if(a.ceilingHeight()!=null)rate+=a.ceilingHeight().subtract(new BigDecimal("2.5")).multiply(new BigDecimal("500")).longValue();
            repair=repair.add(area.areaM2().multiply(BigDecimal.valueOf(rate)).multiply(factor));
        }
        if(a.ceilingHeight()==null)notes.add("Высота потолков не указана: демонстрационный норматив 2,5 м");
        for(String w:List.of(a.demolition(),a.wallPreparation(),a.floorPreparation(),a.electrical()))if(Set.of("partial","local").contains(w))notes.add("Частичная работа: демонстрационный типовой объём 50%");
        BigDecimal balcony=BigDecimal.ZERO,loggia=BigDecimal.ZERO;
        if(Set.of("balcony","both").contains(d.exteriors().presence()))balcony=exterior(d.exteriors().balcony(),"3.0","Балкон",notes).multiply(factor);
        if(Set.of("loggia","both").contains(d.exteriors().presence()))loggia=exterior(d.exteriors().loggia(),"4.5","Лоджия",notes).multiply(factor);
        repair=repair.add(balcony).add(loggia);
        BigDecimal kitchen=BigDecimal.ZERO;
        boolean equipped=a.targetState()!=ru.prorab.project.model.TargetState.FINISH_ONLY;
        for(var entry:d.kitchens().entrySet()){
            Kitchen k=entry.getValue();BigDecimal subtotal=BigDecimal.ZERO;
            boolean newCabinet=k.cabinets().equals("new")||k.cabinets().equals("unknown")&&equipped;
            if(newCabinet){BigDecimal length=k.lengthM()==null?new BigDecimal("3"):k.lengthM();
                subtotal=length.multiply(BigDecimal.valueOf(40000+material(k.facade())+material(k.countertop())));
                if(k.lengthM()==null)notes.add("Кухня: демонстрационная длина гарнитура 3 м");}
            String stove=k.stove()==null?(equipped?"hob":"none"):k.stove();
            long appliances=stove.equals("cooker")?45000:stove.equals("hob")?25000:0;
            if(!stove.equals("cooker")&&selected(k.oven(),equipped))appliances+=30000;
            if(selected(k.refrigerator(),equipped))appliances+=50000;
            if(selected(k.hood(),equipped))appliances+=15000;
            if(selected(k.dishwasher(),equipped))appliances+=40000;
            // Installation is proportional only to purchased equipment. Sink stays in wet-area repair.
            kitchen=kitchen.add(subtotal.add(BigDecimal.valueOf(appliances).multiply(new BigDecimal("1.10"))).multiply(factor));
            if(!equipped&&(newCabinet||appliances>0))notes.add("Дополнительное оснащение кухни при цели «Чистовая отделка»");
        }
        if(a.targetState()==ru.prorab.project.model.TargetState.FULLY_FURNISHED){repair=repair.add(a.areaM2().multiply(new BigDecimal("3000")).multiply(factor));notes.add("Основная мебель: демонстрационный норматив");}
        return new RefinedEstimate(id,revision,true,"demo-prices-1","demo-refinement-1",AreaAllocator.VERSION,
                totals(repair),totals(kitchen),totals(repair.add(kitchen)),money(balcony),money(loggia),null,null,
                List.of("Пересчёт по сохранённым параметрам и составу помещений", "Сравнение демонстрационных оценок; реальные цены не подключены"),List.copyOf(notes));
    }
    private String effective(String value,String general){return value.equals("inherit")?general:value;}
    private boolean selected(Boolean value,boolean fallback){return value==null?fallback:value;}
    private long work(String v,long fallback,String excluded){if(v.equals(excluded)||v.equals("none"))return 0;if(v.equals("unknown"))return fallback;return Set.of("partial","local").contains(v)?1500:3000;}
    private long material(String code){return switch(code){case "unknown","inherit"->1000;case "laminate","wallpaper","film","laminated"->1200;case "vinyl","paint","stretch","plastic"->1800;case "tile","plaster","drywall"->2400;case "parquet","stone","enamel"->3500;default->0;};}
    private BigDecimal exterior(Exterior e,String defaultArea,String label,List<String> notes){
        BigDecimal area=e.areaM2()==null?new BigDecimal(defaultArea):e.areaM2();
        if(e.areaM2()==null)notes.add(label+": расчётная площадь "+defaultArea+" м² (не обмер)");
        long rate=material(e.floor())+material(e.walls());
        if(e.glazing().equals("new"))rate+=10000;else if(e.glazing().equals("unknown"))notes.add(label+": существующее остекление сохраняется");
        if(!e.insulation().equals("no"))rate+=3000;
        if(!e.ceiling().equals("none"))rate+=1000+material(e.ceiling());
        long fixed=(selected(e.lighting(),true)?3000:0)+(selected(e.sockets(),true)?2000:0);
        if(e.insulation().equals("unknown")||e.lighting()==null||e.sockets()==null||e.ceiling().equals("unknown"))notes.add(label+": неизвестные работы определены демонстрационными нормативами");
        return area.multiply(BigDecimal.valueOf(rate)).add(BigDecimal.valueOf(fixed));
    }
    private static BigDecimal money(BigDecimal n){return n.setScale(0,RoundingMode.HALF_UP);}
    private Totals totals(BigDecimal n){return new Totals(money(n.multiply(new BigDecimal("0.90"))),money(n.multiply(new BigDecimal("1.15"))),money(n),money(n.multiply(new BigDecimal("1.10"))));}
}
