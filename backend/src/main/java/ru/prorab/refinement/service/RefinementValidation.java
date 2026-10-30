package ru.prorab.refinement.service;

import org.springframework.stereotype.Component;
import ru.prorab.common.exception.BusinessException;
import ru.prorab.refinement.model.RefinementData.*;
import ru.prorab.refinement.model.RefinementData;
import java.math.BigDecimal;
import java.util.*;

@Component
public class RefinementValidation {
    public static final Set<String> ROOM_TYPES=Set.of("living","kitchen","combined_bathroom","bathroom","toilet","corridor","wardrobe","storage","other");
    public void validate(RefinementData d) {
        Apartment a=d.apartment();
        if(a==null||a.currentState()==null||a.targetState()==null||a.finishLevel()==null)fail("Укажите состояния квартиры и уровень ремонта");
        number(a.areaM2(),1,true,"Площадь квартиры");
        if(a.areaM2().precision()-a.areaM2().scale()>9)fail("Площадь квартиры слишком велика");
        number(a.ceilingHeight(),1,false,"Высота потолков");
        if(a.ceilingHeight()!=null&&(a.ceilingHeight().compareTo(new BigDecimal("2"))<0||a.ceilingHeight().compareTo(new BigDecimal("10"))>0))fail("Высота потолков: от 2 до 10 м");
        materials(a.floor(),a.walls(),a.ceiling(),false);
        choice(a.doors(),"unknown","standard","concealed");
        choice(a.demolition(),"unknown","full","partial","none");
        choice(a.wallPreparation(),"unknown","full","local","ready");choice(a.floorPreparation(),"unknown","new","local","ready");choice(a.electrical(),"unknown","full","partial","keep");
        if(d.rooms()==null||d.kitchens()==null||d.exteriors()==null)fail("Неполные данные раздела");
        Set<UUID> ids=new HashSet<>();
        for(Room r:d.rooms()){
            if(r.id()==null||!ids.add(r.id()))fail("Повторяющийся идентификатор помещения");
            if(!ROOM_TYPES.contains(r.type()))fail("Недопустимый тип помещения");
            if(r.name()==null||r.name().isBlank()||r.name().length()>100)fail("Название помещения: от 1 до 100 символов");
            number(r.areaM2(),1,false,"Площадь помещения");materials(r.floor(),r.walls(),r.ceiling(),true);
        }
        for(var entry:d.kitchens().entrySet()){
            if(d.rooms().stream().noneMatch(r->r.id().equals(entry.getKey())&&r.type().equals("kitchen")))fail("Кухня не найдена");
            Kitchen k=entry.getValue();if(k==null)fail("Не указаны данные кухни");
            choice(k.cabinets(),"unknown","new","keep");number(k.lengthM(),1,false,"Длина гарнитура");
            choice(k.facade(),"unknown","film","plastic","enamel");choice(k.countertop(),"unknown","laminated","stone");
            if(k.stove()!=null)choice(k.stove(),"none","cooker","hob");
        }
        Exteriors e=d.exteriors();choice(e.presence(),"none","balcony","loggia","both");
        exterior(e.balcony());exterior(e.loggia());
    }
    private void exterior(Exterior e){
        if(e==null)fail("Не указаны параметры балкона/лоджии");
        number(e.areaM2(),1,false,"Площадь балкона/лоджии");choice(e.glazing(),"unknown","keep","new","none");choice(e.insulation(),"unknown","yes","no");
        choice(e.floor(),"unknown","laminate","vinyl","parquet","tile");choice(e.walls(),"unknown","wallpaper","paint","plaster");
        choice(e.ceiling(),"unknown","none","required","stretch","paint","drywall");
    }
    private void materials(String floor,String walls,String ceiling,boolean inherit){
        choice(floor,inherit?"inherit":"unknown","unknown","laminate","vinyl","parquet","tile");
        choice(walls,inherit?"inherit":"unknown","unknown","wallpaper","paint","plaster");
        choice(ceiling,inherit?"inherit":"unknown","unknown","stretch","paint","drywall");
    }
    private void number(BigDecimal v,int scale,boolean required,String name){if(v==null){if(required)fail(name+": обязательное поле");return;}if(v.signum()<=0||v.stripTrailingZeros().scale()>scale||v.precision()>12)fail(name+": положительное число, знаков после запятой не больше "+scale);}
    private void choice(String v,String... allowed){if(v==null||!Arrays.asList(allowed).contains(v))fail("Недопустимое значение поля: "+Arrays.toString(allowed));}
    private void fail(String message){throw new BusinessException(message);}
}
