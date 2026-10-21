package ru.prorab.refinement.service;

import org.springframework.stereotype.Component;
import ru.prorab.project.entity.Project;
import ru.prorab.refinement.model.RefinementData;
import ru.prorab.refinement.model.RefinementData.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Shared wizard defaults: preliminary estimate and refinement start from identical inputs. */
@Component
public class InitialRefinementData {
    public RefinementData from(Project p){
        List<Room> rooms=new ArrayList<>();
        int living=p.getRoomsCount()==null?RefinementService.recommended(p.getAreaM2()):p.getRoomsCount();
        add(rooms,p,"living","Комната",living);
        add(rooms,p,"kitchen","Кухня",Objects.requireNonNullElse(p.getKitchensCount(),1));
        add(rooms,p,"combined_bathroom","Санузел",Objects.requireNonNullElse(p.getBathroomsCount(),1));
        Map<UUID,Kitchen> kitchens=new LinkedHashMap<>();
        rooms.stream().filter(r->r.type().equals("kitchen")).forEach(r->kitchens.put(r.id(),Kitchen.defaults()));
        Apartment a=new Apartment(p.getCurrentState(),p.getTargetState(),p.getFinishLevel(),p.getAreaM2(),null,"unknown","unknown","unknown","unknown","unknown","unknown","unknown","unknown",p.getRedevelopment());
        return new RefinementData(a,List.copyOf(rooms),p.getRoomsCount()!=null,kitchens,new Exteriors("none",Exterior.defaults(),Exterior.defaults()),Set.of());
    }
    private void add(List<Room> rooms,Project p,String type,String label,int count){
        for(int i=1;i<=count;i++)rooms.add(new Room(UUID.nameUUIDFromBytes((p.getProjectId()+":"+type+":"+i).getBytes(StandardCharsets.UTF_8)),type,label+" "+i,null,"inherit","inherit","inherit",true));
    }
}
