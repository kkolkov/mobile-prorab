package ru.prorab.refinement.service;

import org.springframework.stereotype.Component;
import ru.prorab.refinement.model.RefinementData.Room;
import java.math.*;
import ru.prorab.refinement.model.AreaAllocation;
import ru.prorab.refinement.model.AreaAllocation.Area;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Component
public class AreaAllocator {
    public static final String VERSION = "area-norms-2.5";
    private static final MathContext MC = MathContext.DECIMAL128;
    private static final BigDecimal CENT = new BigDecimal("0.01");
    private static class Slot {
        UUID id; String type; BigDecimal value, typical, max;
        Slot(UUID id, String type, BigDecimal min, BigDecimal typical, BigDecimal max) {
            this.id=id;this.type=type;this.max=max.max(min);this.typical=typical.max(min).min(this.max);value=min;
        }
    }
    public AreaAllocation allocate(UUID projectId, BigDecimal total, List<Room> rooms) {
        BigDecimal known=rooms.stream().map(Room::areaM2).filter(Objects::nonNull).reduce(BigDecimal.ZERO,BigDecimal::add);
        BigDecimal remaining=total.subtract(known);
        BigDecimal tolerance=new BigDecimal("0.5").max(total.multiply(new BigDecimal("0.01")));
        List<String> notes=new ArrayList<>();
        List<Area> areas=new ArrayList<>();
        rooms.stream().filter(r->r.areaM2()!=null).forEach(r->areas.add(new Area(r.id(),r.type(),r.areaM2(),false)));
        if (remaining.compareTo(tolerance.negate())<0) return result(known,remaining,false,true,areas,List.of("Сумма площадей превышает допустимое значение"));
        int living=(int)rooms.stream().filter(r->r.type().equals("living")).count();
        int baths=Math.max(1,(int)rooms.stream().filter(r->Set.of("combined_bathroom","bathroom","toilet").contains(r.type())).count());
        List<Slot> slots=new ArrayList<>();
        rooms.stream().filter(r->r.areaM2()==null).forEach(r->slots.add(slot(r.id(),r.type(),total,living,baths)));
        BigDecimal minimum=slots.stream().map(s->s.value).reduce(BigDecimal.ZERO,BigDecimal::add);
        if (remaining.compareTo(minimum)<0 && !slots.isEmpty()) return result(known,remaining,false,false,areas,List.of("Проверьте площади и состав помещений"));
        if (remaining.signum()<0) return result(known,remaining,true,false,areas,List.of("Небольшое превышение площади: расчёт по пользовательским обмерам"));
        BigDecimal free=remaining.subtract(minimum);
        if (rooms.stream().noneMatch(r->r.type().equals("corridor"))) {
            if (free.compareTo(new BigDecimal("3"))>=0) {
                UUID id=UUID.nameUUIDFromBytes((projectId+":calculated-corridor").getBytes(StandardCharsets.UTF_8));
                Slot corridor=slot(id,"corridor",total,living,baths);slots.add(corridor);free=free.subtract(corridor.value);
                notes.add("Добавлен расчётный коридор; его площадь не является обмером");
            } else notes.add("Расчётный коридор не добавлен: недостаточно свободной площади");
        }
        free=distribute(slots,free,false);
        free=distribute(slots,free,true);
        Map<UUID,BigDecimal> fractions=new HashMap<>();
        BigDecimal allocated=BigDecimal.ZERO;
        for(Slot s:slots){BigDecimal raw=s.value;s.value=raw.setScale(2,RoundingMode.DOWN);fractions.put(s.id,raw.subtract(s.value));allocated=allocated.add(s.value);}
        BigDecimal other=free.setScale(2,RoundingMode.DOWN);
        BigDecimal cents=remaining.subtract(allocated).subtract(other);
        List<Slot> ordered=slots.stream().sorted(Comparator.<Slot,BigDecimal>comparing(s->fractions.get(s.id)).reversed().thenComparing(s->s.id.toString())).toList();
        for(Slot s:ordered) if(cents.compareTo(CENT)>=0 && s.value.add(CENT).compareTo(s.max)<=0){s.value=s.value.add(CENT);cents=cents.subtract(CENT);}
        other=other.add(cents);
        for(Slot s:slots){areas.add(new Area(s.id,s.type,s.value,true));String name=rooms.stream().filter(r->r.id().equals(s.id)).map(Room::name).findFirst().orElse("Коридор");notes.add("Расчётная площадь «"+name+"»: "+s.value+" м²");}
        if(other.signum()>0){areas.add(new Area(UUID.nameUUIDFromBytes((projectId+":other-area").getBytes(StandardCharsets.UTF_8)),"other",other,true));notes.add("Остаток отнесён к прочей площади с сухой отделкой");}
        return result(known,remaining,true,false,areas,notes);
    }
    private BigDecimal distribute(List<Slot> slots, BigDecimal free, boolean maximum) {
        BigDecimal need=slots.stream().map(s->(maximum?s.max:s.typical).subtract(s.value)).reduce(BigDecimal.ZERO,BigDecimal::add);
        if(need.signum()==0||free.signum()==0)return free;
        BigDecimal use=free.min(need);
        for(Slot s:slots){BigDecimal delta=(maximum?s.max:s.typical).subtract(s.value);s.value=s.value.add(delta.multiply(use).divide(need,MC));}
        return free.subtract(use);
    }
    private Slot slot(UUID id,String type,BigDecimal a,int living,int baths){
        return switch(type){
            case "living"->fixed(id,type,"8","18","45");
            case "kitchen"->fixed(id,type,"5","10","25");
            case "combined_bathroom"->new Slot(id,type,new BigDecimal("2.5"),a.multiply(new BigDecimal("0.08")).divide(BigDecimal.valueOf(baths),MC).max(new BigDecimal("3.5")).min(new BigDecimal("7")),a.multiply(new BigDecimal("0.15")).min(BigDecimal.TEN));
            case "bathroom"->fixed(id,type,"2.5","4.5","10");
            case "toilet"->fixed(id,type,"1","1.5","4");
            case "corridor"->new Slot(id,type,new BigDecimal("3"),a.multiply(new BigDecimal(living<=1?"0.10":living==2?"0.13":living==3?"0.15":"0.17")).max(new BigDecimal("3")).min(new BigDecimal("14")),a.multiply(new BigDecimal("0.22")).min(new BigDecimal("18")));
            case "wardrobe"->fixed(id,type,"1","3","8");
            case "storage"->fixed(id,type,"1","2","6");
            default->fixed(id,type,"1","4","20");
        };
    }
    private Slot fixed(UUID id,String type,String min,String typical,String max){return new Slot(id,type,new BigDecimal(min),new BigDecimal(typical),new BigDecimal(max));}
    private AreaAllocation result(BigDecimal known,BigDecimal remaining,boolean complete,boolean blocked,List<Area> areas,List<String> notes){return new AreaAllocation(known,remaining,complete,blocked,List.copyOf(areas),List.copyOf(notes),VERSION);}
}
