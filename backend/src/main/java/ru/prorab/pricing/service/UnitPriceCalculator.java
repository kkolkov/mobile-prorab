package ru.prorab.pricing.service;

import org.springframework.stereotype.Component;
import ru.prorab.pricing.dto.CostDetails;
import ru.prorab.refinement.dto.RefinedEstimate;
import ru.prorab.refinement.dto.RefinedEstimate.Totals;
import ru.prorab.refinement.model.AreaAllocation;
import ru.prorab.refinement.model.RefinementData;
import ru.prorab.refinement.model.RefinementData.*;
import ru.prorab.refinement.service.AreaAllocator;
import ru.prorab.refinement.service.RefinementCalculator;
import ru.prorab.project.model.*;
import java.math.*;
import java.util.*;

/** Unit pricing MVP. Prices and composition shares are provisional; geometry assumptions are explicit. */
@Component
public class UnitPriceCalculator implements RefinementCalculator {
    public static final String VERSION="unit-pricing-4";
    private final PriceCatalog catalog;
    public UnitPriceCalculator(PriceCatalog catalog){this.catalog=catalog;}
    public RefinedEstimate calculate(UUID id,long revision,RefinementData d,AreaAllocation allocation){
        if(!allocation.complete())throw new IllegalArgumentException("Incomplete area allocation");
        Apartment a=d.apartment();
        Ledger bill=new Ledger(catalog.snapshot(),a.finishLevel());
        List<String> notes=new ArrayList<>(allocation.assumptions());
        notes.add("Расчёт по объёмам и 10 базовым ставкам из справочника. Стартовые ставки условные, не подтверждены рынком.");
        notes.add("Нет обмеров периметра и проёмов: помещение условно квадратное; стены = 4 × √площадь × высота × 0,85. Проёмы — 15%.");
        notes.add("Высота: "+(a.ceilingHeight()==null?"норматив 2,7 м":a.ceilingHeight()+" м по вводу")+". Расчётные объёмы не подставляются в поля пользователя.");
        notes.add("Класс: Бюджетный ×1; Комфорт ×1,3; Бизнес ×1,7. Материалы и оснащение используют относительные коэффициенты модели, не рыночные котировки.");
        notes.add("Неизвестная отделка: ламинат, обои, натяжной потолок; санузлы: плитка на полу и стенах. Частичные работы — 50% объёма.");
        notes.add("Электрика: 1 точка на 4 м² с округлением вверх в каждом помещении. Санузел: 3 точки, ванная: 2, туалет/кухня: 1. Межкомнатные двери — по одной на комнату и санузел.");
        notes.add("Диапазон −10%/+15%, резерв 10% сверх максимума — допущения модели, не статистический доверительный интервал. Разделение материалов и работ по условным долям справочника.");
        notes.add("Срок — ориентир по последовательным фазам в календарных днях, не гарантия. Технологическая пауза 8 дней условная: фактическую сушку определяют материалы и условия. Вывоз мусора, доставка и изменение планировки отдельно не оценены.");
        BigDecimal height=a.ceilingHeight()==null?n("2.7"):a.ceilingHeight();
        Map<UUID,Room> rooms=new HashMap<>();d.rooms().forEach(r->rooms.put(r.id(),r));
        for(var area:allocation.areas()){
            Room r=rooms.get(area.id());String label=r==null?"Расчётная площадь":r.name();
            boolean wet=Set.of("combined_bathroom","bathroom","toilet").contains(area.type());
            boolean shared=Set.of("living","kitchen","corridor","other").contains(area.type());
            String floor=effective(r==null?"inherit":r.floor(),wet?"tile":shared?a.floor():"unknown");
            String walls=effective(r==null?"inherit":r.walls(),wet?"tile":shared?a.walls():"unknown");
            if(wet&&walls.equals("unknown"))walls="tile";
            String ceiling=effective(r==null?"inherit":r.ceiling(),wet?"stretch":shared?a.ceiling():"unknown");
            BigDecimal surface=walls(area.areaM2(),height);
            bill.add("repair",label+": пол","floor",area.areaM2(),material(floor));
            bill.add("repair",label+": стены","wall",surface,material(walls));
            bill.add("repair",label+": потолок","ceiling",area.areaM2(),material(ceiling));
            BigDecimal prepare=switch(a.currentState()){case WHITE_BOX->BigDecimal.ZERO;case LIVED_IN->n("0.5");default->BigDecimal.ONE;};
            bill.add("repair",label+": подготовка стен","preparation",surface.multiply(work(a.wallPreparation(),prepare,"ready")),BigDecimal.ONE);
            bill.add("repair",label+": подготовка пола","preparation",area.areaM2().multiply(work(a.floorPreparation(),prepare,"ready")),BigDecimal.ONE);
            BigDecimal demolish=switch(a.currentState()){case OLD_FINISH->BigDecimal.ONE;case LIVED_IN->n("0.5");default->BigDecimal.ZERO;};
            bill.add("repair",label+": демонтаж","demolition",surface.add(area.areaM2().multiply(n("2"))).multiply(work(a.demolition(),demolish,"none")),BigDecimal.ONE);
            BigDecimal electric=switch(a.currentState()){case WHITE_BOX,LIVED_IN->BigDecimal.ZERO;default->BigDecimal.ONE;};
            bill.add("repair",label+": электрика","electrical",area.areaM2().divide(n("4"),0,RoundingMode.CEILING).multiply(work(a.electrical(),electric,"keep")),BigDecimal.ONE);
            int points=switch(area.type()){case "combined_bathroom"->3;case "bathroom"->2;case "toilet","kitchen"->1;default->0;};
            // Finish-only includes connection points; other targets include basic fixtures.
            bill.add("repair",label+": сантехника","plumbing",BigDecimal.valueOf(points),a.targetState()==TargetState.FINISH_ONLY?n("0.35"):BigDecimal.ONE);
            if(wet||area.type().equals("living"))bill.add("repair",label+": дверь","joinery",BigDecimal.ONE,a.doors().equals("concealed")?n("0.5"):n("0.25"));
        }
        boolean equipped=a.targetState()!=TargetState.FINISH_ONLY;
        for(var entry:new TreeMap<>(d.kitchens()).entrySet()){
            Kitchen k=entry.getValue();String label=rooms.containsKey(entry.getKey())?rooms.get(entry.getKey()).name():"Кухня";
            if(k.cabinets().equals("new")||k.cabinets().equals("unknown")&&equipped){
                BigDecimal length=k.lengthM()==null?n("3"):k.lengthM();
                bill.add("kitchen",label+": гарнитур","joinery",length.divide(n("3"),8,RoundingMode.HALF_UP),material(k.facade()).multiply(material(k.countertop())));
                if(k.lengthM()==null)notes.add(label+": длина гарнитура условно 3 м. Ставка — за базовый комплект 3 м.");
            }
            String stove=k.stove()==null?(equipped?"hob":"none"):k.stove();
            if(!stove.equals("none"))bill.add("kitchen",label+": плита/панель","equipment",BigDecimal.ONE,stove.equals("cooker")?n("1.5"):BigDecimal.ONE);
            if(!stove.equals("cooker")&&selected(k.oven(),equipped))bill.add("kitchen",label+": духовка","equipment",BigDecimal.ONE,BigDecimal.ONE);
            if(selected(k.refrigerator(),equipped))bill.add("kitchen",label+": холодильник","equipment",BigDecimal.ONE,n("1.5"));
            if(selected(k.hood(),equipped))bill.add("kitchen",label+": вытяжка","equipment",BigDecimal.ONE,n("0.5"));
            if(selected(k.dishwasher(),equipped))bill.add("kitchen",label+": посудомоечная машина","equipment",BigDecimal.ONE,n("1.3"));
        }
        notes.add("Кухонная техника: панель/духовка ×1, плита/холодильник ×1,5, вытяжка ×0,5, посудомойка ×1,3 от базового прибора. Плита уже включает духовку. Монтаж включён в ставки.");
        notes.add("Дверь: ×0,25 базового мебельного комплекта, скрытая ×0,5. Основная мебель: по 0,5 комплекта на жилую комнату. Это условные эквиваленты до детализации справочника.");
        if(a.targetState()==TargetState.FULLY_FURNISHED)bill.add("repair","Основная мебель","joinery",BigDecimal.valueOf(d.rooms().stream().filter(r->r.type().equals("living")).count()),n("0.5"));
        if(Set.of("balcony","both").contains(d.exteriors().presence()))exterior(bill,"balcony",d.exteriors().balcony(),"3.0",height,notes);
        if(Set.of("loggia","both").contains(d.exteriors().presence()))exterior(bill,"loggia",d.exteriors().loggia(),"4.5",height,notes);
        BigDecimal balcony=bill.sum("balcony"),loggia=bill.sum("loggia"),repair=bill.sum("repair").add(balcony).add(loggia),kitchen=bill.sum("kitchen");
        var time=ru.prorab.execution.service.TimePlanner.calculate(d,bill.details());
        return new RefinedEstimate(id,revision,true,bill.prices.version(),VERSION,AreaAllocator.VERSION,
                totals(repair),totals(kitchen),totals(repair.add(kitchen)),balcony,loggia,time.totalDays(),(int)Math.ceil(time.totalDays()*1.2),
                List.of("Объёмы работ × ставки справочника × коэффициенты отделки", "Состав работ зависит от исходного состояния, цели и явных отказов"),List.copyOf(notes),bill.details(),time);
    }
    private void exterior(Ledger bill,String section,Exterior e,String defaultArea,BigDecimal height,List<String> notes){
        String label=section.equals("balcony")?"Балкон":"Лоджия";
        BigDecimal area=e.areaM2()==null?n(defaultArea):e.areaM2();
        if(e.areaM2()==null)notes.add(label+": расчётная площадь "+defaultArea+" м² (не обмер)");
        bill.add(section,label+": пол","floor",area,material(e.floor()));
        bill.add(section,label+": стены","wall",walls(area,height),material(e.walls()));
        if(!e.ceiling().equals("none"))bill.add(section,label+": потолок","ceiling",area,material(e.ceiling()));
        if(!e.insulation().equals("no"))bill.add(section,label+": утепление","preparation",walls(area,height).add(area),n("2"));
        if(e.glazing().equals("new")){
            bill.add(section,label+": остекление","glazing",area.sqrt(MathContext.DECIMAL64).multiply(height),BigDecimal.ONE);
            notes.add(label+": площадь остекления условно √площадь пола × высота; утепление ×2 подготовки поверхности.");
        }
        if(selected(e.lighting(),true))bill.add(section,label+": освещение","electrical",BigDecimal.ONE,BigDecimal.ONE);
        if(selected(e.sockets(),true))bill.add(section,label+": розетка","electrical",BigDecimal.ONE,BigDecimal.ONE);
        notes.add(label+": неизвестное остекление сохраняется; неизвестные утепление, потолок, свет и розетка включаются по нормативу.");
    }
    private static BigDecimal walls(BigDecimal area,BigDecimal height){return area.sqrt(MathContext.DECIMAL64).multiply(n("4")).multiply(height).multiply(n("0.85"));}
    private static String effective(String value,String general){return value.equals("inherit")?general:value;}
    private static boolean selected(Boolean v,boolean fallback){return v==null?fallback:v;}
    private static BigDecimal work(String v,BigDecimal fallback,String excluded){if(v.equals(excluded)||v.equals("none"))return BigDecimal.ZERO;if(v.equals("unknown"))return fallback;return Set.of("partial","local").contains(v)?n("0.5"):BigDecimal.ONE;}
    private static BigDecimal material(String code){return n(switch(code){case "vinyl","paint","plastic"->"1.2";case "tile","plaster","drywall"->"1.6";case "parquet","stone","enamel"->"2.2";default->"1";});}
    private static BigDecimal n(String value){return new BigDecimal(value);}
    private static BigDecimal money(BigDecimal value){return value.setScale(0,RoundingMode.HALF_UP);}
    private static Totals totals(BigDecimal value){BigDecimal max=money(value.multiply(n("1.15")));return new Totals(money(value.multiply(n("0.9"))),max,value,money(max.multiply(n("1.1"))));}
    private static class Ledger {
        final PriceCatalog.Snapshot prices;
        final BigDecimal level;
        final List<CostDetails.Line> lines=new ArrayList<>();
        BigDecimal rough=BigDecimal.ZERO,finish=BigDecimal.ZERO,labor=BigDecimal.ZERO;
        Ledger(PriceCatalog.Snapshot prices,FinishLevel level){this.prices=prices;this.level=n(switch(level){case BUDGET->"1";case COMFORT->"1.3";case BUSINESS->"1.7";});}
        void add(String section,String name,String code,BigDecimal quantity,BigDecimal multiplier){
            quantity=quantity.setScale(4,RoundingMode.HALF_UP);if(quantity.signum()==0)return;
            var rate=prices.rate(code);BigDecimal coefficient=level.multiply(multiplier);
            BigDecimal amount=money(quantity.multiply(rate.price()).multiply(coefficient));
            BigDecimal r=money(amount.multiply(rate.roughShare())),l=money(amount.multiply(rate.laborShare()));
            rough=rough.add(r);labor=labor.add(l);finish=finish.add(amount.subtract(r).subtract(l));
            lines.add(new CostDetails.Line(section,name,code,rate.unit(),quantity,rate.price(),coefficient,amount,rate.source(),rate.date()));
        }
        BigDecimal sum(String section){return lines.stream().filter(l->l.section().equals(section)).map(CostDetails.Line::amountRub).reduce(BigDecimal.ZERO,BigDecimal::add);}
        CostDetails details(){return new CostDetails(rough,finish,labor,List.copyOf(lines));}
    }
}
