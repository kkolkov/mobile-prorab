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
    public static final String VERSION="catalog-pricing-5";
    private final PriceCatalog catalog;
    private final ru.prorab.execution.service.TimePlanner timePlanner;
    public UnitPriceCalculator(PriceCatalog catalog,ru.prorab.execution.service.TimePlanner timePlanner){this.catalog=catalog;this.timePlanner=timePlanner;}
    public RefinedEstimate calculate(UUID id,long revision,RefinementData d,AreaAllocation allocation){
        if(!allocation.complete())throw new IllegalArgumentException("Incomplete area allocation");
        Apartment a=d.apartment();
        Ledger bill=new Ledger(catalog.snapshot(),a.finishLevel());
        List<String> notes=new ArrayList<>(allocation.assumptions());
        notes.add("Цены отделки — среднее арифметическое по 16 городам: отдельно работа и материалы. Выбор города не используется.");
        notes.add("Работы и материалы отделки — отдельные ставки из городского справочника 28.10.2026. Это нормативные ориентиры, не предложения бригады. В источниках строк сохранены городские значения и пояснения состава; исходные диапазоны — в предоставленном Excel.");
        notes.add("Для городских материалов без цен по классам сохранён оценочный множитель: Бюджет ×1, Комфорт ×1,3, Бизнес/Премиум ×1,7. Работы идут без множителя. Комплекты дверей, кухни и техника уже выбраны по классу: повторного множителя нет.");
        notes.add("Нет обмеров периметра и проёмов: помещение условно квадратное; стены = 4 × √площадь × высота × 0,85. Проёмы — 15%. Высота без ввода — 2,7 м. Частичные работы — 50% объёма.");
        notes.add("Неизвестная отделка: ламинат, обои, натяжной потолок; санузлы: плитка на полу и стенах. Демонтаж без данных о прежнем покрытии: обои, ламинат, натяжной потолок. Новое покрытие не определяет старое.");
        notes.add("Электрика, сантехнические трассы, остекление и утепление сохраняют укрупнённые ставки и допущения прежней модели; они отмечены в строках. Импорт справочника не подтверждает эти нормы.");
        notes.add("Диапазон −10%/+15%, резерв 10% сверх максимума — допущения модели. Сроки и технологические паузы остаются предварительными. Доставка, вывоз мусора и перепланировка отдельно не оценены.");
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
            bill.finish("repair",label+": пол","floor",floor,area.areaM2());
            bill.finish("repair",label+": стены","wall",walls,surface);
            bill.finish("repair",label+": потолок","ceiling",ceiling,area.areaM2());
            BigDecimal prepare=switch(a.currentState()){case WHITE_BOX->BigDecimal.ZERO;case LIVED_IN->n("0.5");default->BigDecimal.ONE;};
            bill.operation("repair",label+": подготовка стен","plaster_wall",surface.multiply(work(a.wallPreparation(),prepare,"ready")),false);
            bill.operation("repair",label+": подготовка пола","screed",area.areaM2().multiply(work(a.floorPreparation(),prepare,"ready")),false);
            BigDecimal demolish=switch(a.currentState()){case OLD_FINISH->BigDecimal.ONE;case LIVED_IN->n("0.5");default->BigDecimal.ZERO;};
            BigDecimal demo=work(a.demolition(),demolish,"none");
            bill.reference("repair",label+": демонтаж стен","L_demo_paper",surface.multiply(demo));
            bill.reference("repair",label+": демонтаж пола","L_demo_floor",area.areaM2().multiply(demo));
            bill.reference("repair",label+": демонтаж потолка","L_demo_c_stretch",area.areaM2().multiply(demo));
            BigDecimal electric=switch(a.currentState()){case WHITE_BOX,LIVED_IN->BigDecimal.ZERO;default->BigDecimal.ONE;};
            bill.add("repair",label+": электрика","electrical",area.areaM2().divide(n("4"),0,RoundingMode.CEILING).multiply(work(a.electrical(),electric,"keep")),BigDecimal.ONE);
            int points=switch(area.type()){case "combined_bathroom"->3;case "bathroom"->2;case "toilet","kitchen"->1;default->0;};
            // Finish-only includes connection points; other targets include basic fixtures.
            bill.add("repair",label+": сантехника","plumbing",BigDecimal.valueOf(points),a.targetState()==TargetState.FINISH_ONLY?n("0.35"):BigDecimal.ONE);
            if(wet||area.type().equals("living")){
                String door=a.doors().equals("concealed")?"hidden":"ordinary";
                bill.reference("repair",label+": дверной комплект","D_"+door+"_"+bill.grade,BigDecimal.ONE);
                bill.reference("repair",label+": монтаж двери","L_door_"+door,BigDecimal.ONE);
            }
        }
        boolean equipped=a.targetState()!=TargetState.FINISH_ONLY;
        for(var entry:new TreeMap<>(d.kitchens()).entrySet()){
            Kitchen k=entry.getValue();String label=rooms.containsKey(entry.getKey())?rooms.get(entry.getKey()).name():"Кухня";
            if(k.cabinets().equals("new")||k.cabinets().equals("unknown")&&equipped){
                BigDecimal length=k.lengthM()==null?n("3"):k.lengthM();
                boolean custom=!Set.of("unknown","film").contains(k.facade())||!Set.of("unknown","laminated").contains(k.countertop());
                if(custom){
                    bill.add("kitchen",label+": гарнитур с выбранными фасадами/столешницей (укрупнённая оценка)","joinery",length.divide(n("3"),8,RoundingMode.HALF_UP),material(k.facade()).multiply(material(k.countertop())));
                    notes.add(label+": для выбранных фасадов/столешницы нет сопоставимого комплекта в файле; сохранена прежняя оценка с монтажом, цена комплекта повторно не добавлена.");
                }else{
                    // Imported cabinets are sold in 0.01 of a 3 m kit, not at the full kit price.
                    bill.reference("kitchen",label+": гарнитур","K_cabinets_"+bill.grade,length.divide(n("3"),8,RoundingMode.HALF_UP).divide(n("0.01"),0,RoundingMode.CEILING));
                    bill.reference("kitchen",label+": сборка гарнитура","L_kitchen_assembly",length);
                }
                if(k.lengthM()==null)notes.add(label+": длина гарнитура условно 3 м. Состав — шкафы и столешница; сборка отдельной строкой.");
            }
            String stove=k.stove()==null?(equipped?"hob":"none"):k.stove();
            if(stove.equals("cooker"))bill.add("kitchen",label+": плита с духовкой (оценочная ставка)","equipment",BigDecimal.ONE,n("1.5"));
            else if(stove.equals("hob"))bill.appliance(label,"панель",2);
            if(!stove.equals("cooker")&&selected(k.oven(),equipped))bill.appliance(label,"духовка",3);
            if(selected(k.refrigerator(),equipped))bill.appliance(label,"холодильник",1);
            if(selected(k.hood(),equipped))bill.appliance(label,"вытяжка",4);
            if(selected(k.dishwasher(),equipped))bill.appliance(label,"посудомоечная машина",5);
        }
        notes.add("Кухонная техника — отдельные цены по классу. Монтаж каждого прибора оценён как 1/6 ставки установки шести приборов: состав операций отличается, требуется проверка подрядчиком. Отдельно стоящая плита сохраняет прежнюю оценочную ставку и включает духовку.");
        notes.add("Натяжной потолок: полотно отдельно; профиль и крепёж включены в комплекс монтажа. Комплексные услуги отнесены к работам без выдуманной разбивки поставщика. Пакетные материалы округляются после объединения потребности по проекту; упаковка оплачивается один раз, остаток используется следующими помещениями. Световые узлы потолка требуют уточнения и отдельно не добавлены.");
        notes.add("Двери — комплект по выбранному классу и монтаж отдельной строкой. Дополнительные доборы и отделка скрытого полотна не оценены без размеров. Основная мебель полностью обустроенной квартиры сохраняет прежний условный эквивалент.");
        if(a.targetState()==TargetState.FULLY_FURNISHED)bill.add("repair","Основная мебель","joinery",BigDecimal.valueOf(d.rooms().stream().filter(r->r.type().equals("living")).count()),n("0.5"));
        if(Set.of("balcony","both").contains(d.exteriors().presence()))exterior(bill,"balcony",d.exteriors().balcony(),"3.0",height,notes);
        if(Set.of("loggia","both").contains(d.exteriors().presence()))exterior(bill,"loggia",d.exteriors().loggia(),"4.5",height,notes);
        bill.flushMaterials();
        bill.ceilingMinimum();
        boolean verified=bill.lines.stream().allMatch(l->bill.prices.rate(l.priceCode()).verified());
        notes.add(verified?"Использованные цены отмечены администратором как проверенные; геометрия и коэффициенты остаются допущениями модели.":"В расчёте есть цены, ещё не проверенные администратором. Статусы источников сохранены; импорт не означает подтверждение цен рынком.");
        BigDecimal balcony=bill.sum("balcony"),loggia=bill.sum("loggia"),repair=bill.sum("repair").add(balcony).add(loggia),kitchen=bill.sum("kitchen");
        var time=timePlanner.calculate(d,bill.details());
        notes.addAll(time.assumptions());
        return new RefinedEstimate(id,revision,true,bill.prices.version(),VERSION,AreaAllocator.VERSION,
                totals(repair),totals(kitchen),totals(repair.add(kitchen)),balcony,loggia,time.totalDays(),(int)Math.ceil(time.totalDays()*1.2),
                List.of("Работы и материалы по справочникам; комплекты по классу без повторного коэффициента", "Состав работ зависит от исходного состояния, цели и явных отказов"),List.copyOf(notes),bill.details(),time);
    }
    private void exterior(Ledger bill,String section,Exterior e,String defaultArea,BigDecimal height,List<String> notes){
        String label=section.equals("balcony")?"Балкон":"Лоджия";
        BigDecimal area=e.areaM2()==null?n(defaultArea):e.areaM2();
        if(e.areaM2()==null)notes.add(label+": расчётная площадь "+defaultArea+" м² (не обмер)");
        bill.finish(section,label+": пол","floor",e.floor(),area);
        bill.finish(section,label+": стены","wall",e.walls(),walls(area,height));
        if(!e.ceiling().equals("none"))bill.finish(section,label+": потолок","ceiling",e.ceiling(),area);
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
        final String grade;
        final List<CostDetails.Line> lines=new ArrayList<>();
        record MaterialNeed(String section,String id,BigDecimal amount){}
        final List<MaterialNeed> materials=new ArrayList<>();
        static final Map<String,com.fasterxml.jackson.databind.JsonNode> metadata=ru.prorab.pricing.model.ImportedPrices.ROWS.stream().collect(java.util.stream.Collectors.toMap(r->r.get("code").asText(),r->r));
        BigDecimal rough=BigDecimal.ZERO,finish=BigDecimal.ZERO,labor=BigDecimal.ZERO;
        Ledger(PriceCatalog.Snapshot prices,FinishLevel level){this.prices=prices;this.grade=level.name().toLowerCase(Locale.ROOT);this.level=n(switch(level){case BUDGET->"1";case COMFORT->"1.3";case BUSINESS->"1.7";});}
        void add(String section,String name,String code,BigDecimal quantity,BigDecimal multiplier){
            quantity=quantity.setScale(4,RoundingMode.HALF_UP);if(quantity.signum()==0)return;
            direct(section,name,code,quantity,level.multiply(multiplier));
        }
        void direct(String section,String name,String code,BigDecimal quantity,BigDecimal coefficient){
            quantity=quantity.setScale(4,RoundingMode.HALF_UP);if(quantity.signum()==0)return;
            var rate=prices.rate(code);
            BigDecimal amount=money(quantity.multiply(rate.price()).multiply(coefficient));
            BigDecimal r=money(amount.multiply(rate.roughShare())),l=money(amount.multiply(rate.laborShare()));
            rough=rough.add(r);labor=labor.add(l);finish=finish.add(amount.subtract(r).subtract(l));
            lines.add(new CostDetails.Line(section,name,code,rate.unit(),quantity,rate.price(),coefficient,amount,rate.source(),rate.date()));
        }
        void ceilingMinimum(){
            var ceiling=lines.stream().filter(l->Set.of("ref.C_canvas","ref.L_stretch_perimeter","ref.L_stretch_inset").contains(l.priceCode())).toList();
            if(ceiling.isEmpty())return;
            BigDecimal amount=ceiling.stream().map(CostDetails.Line::amountRub).reduce(BigDecimal.ZERO,BigDecimal::add);
            var rate=prices.rate("rule.stretch.minimum");BigDecimal extra=rate.price().subtract(amount);
            if(extra.signum()>0)direct(ceiling.getFirst().section(),"Доплата до минимального заказа потолков (один раз на проект)",rate.code(),BigDecimal.ONE,extra.divide(rate.price(),16,RoundingMode.HALF_UP));
        }
        void materialNeed(String section,String id,BigDecimal base){
            var row=metadata.get("ref."+id);
            BigDecimal need=base.multiply(n(row.get("norm").asText())).multiply(BigDecimal.ONE.add(n(row.get("waste").asText())));
            materials.add(new MaterialNeed(section,id,need));
        }
        void flushMaterials(){
            // One purchase per SKU for the project; split whole packages between sections, never round per room.
            Map<String,Map<String,BigDecimal>> needs=new TreeMap<>();
            for(var m:materials)needs.computeIfAbsent(m.id(),k->new TreeMap<>()).merge(m.section(),m.amount(),BigDecimal::add);
            for(var item:needs.entrySet()){
                var row=metadata.get("ref."+item.getKey());BigDecimal pack=n(row.get("pack").asText());
                BigDecimal cumulative=BigDecimal.ZERO,allocated=BigDecimal.ZERO;
                for(var section:item.getValue().entrySet()){
                    cumulative=cumulative.add(section.getValue());
                    BigDecimal total=cumulative.divide(pack,0,RoundingMode.CEILING);
                    reference(section.getKey(),row.get("title").asText()+" — закупка упаковок на проект",item.getKey(),total.subtract(allocated));allocated=total;
                }
            }
            materials.clear();
        }
        void reference(String section,String name,String id,BigDecimal quantity){direct(section,name,"ref."+id,quantity,BigDecimal.ONE);}
        void operation(String section,String name,String operation,BigDecimal quantity,boolean graded){
            direct(section,name+": работа","average.work."+operation,quantity,BigDecimal.ONE);
            direct(section,name+": материалы","average.material."+operation,quantity,graded?level:BigDecimal.ONE);
        }
        void appliance(String label,String title,int role){
            reference("kitchen",label+": "+title,"K_tech"+role+"_"+grade,BigDecimal.ONE);
            direct("kitchen",label+": подключение — "+title,"ref.L_kitchen_tech",BigDecimal.ONE,n("0.1666666667"));
        }
        void finish(String section,String name,String surface,String material,BigDecimal quantity){
            String op=switch(surface){
                case "floor"->switch(material){case "unknown","laminate"->"laminate";case "parquet"->"parquet";case "tile"->"tile_floor";default->null;};
                case "wall"->switch(material){case "unknown","wallpaper"->"wallpaper";case "paint"->"paint_wall";case "tile"->"tile_wall";default->null;};
                case "ceiling"->material.equals("paint")?"paint_ceiling":null;
                default->null;
            };
            if(op!=null){operation(section,name,op,quantity,true);return;}
            if(surface.equals("floor")&&material.equals("vinyl")){
                materialNeed(section,"F_spc_"+grade,quantity);materialNeed(section,"F_underlay_spc",quantity);
                reference(section,name+": укладка SPC","L_spc",quantity);return;
            }
            if(surface.equals("wall")&&material.equals("plaster")){
                for(String id:List.of("W_decor_"+grade,"W_decor_primer","W_decor_base","W_decor_protect"))materialNeed(section,id,quantity);
                reference(section,name+": декоративная система","L_decor",quantity);return;
            }
            if(surface.equals("ceiling")&&Set.of("unknown","required","stretch").contains(material)){
                reference(section,name+": полотно","C_canvas",quantity);
                // The perimeter package includes profile and fasteners: do not charge them again.
                BigDecimal perimeter=quantity.sqrt(MathContext.DECIMAL64).multiply(n("4"));
                reference(section,name+": монтаж с профилем","L_stretch_perimeter",perimeter);
                reference(section,name+": вставка с установкой","L_stretch_inset",perimeter);return;
            }
            if(surface.equals("ceiling")&&material.equals("drywall")){
                BigDecimal perimeter=quantity.sqrt(MathContext.DECIMAL64).multiply(n("4"));
                for(String id:List.of("C_gkl_dry","C_profile","C_extension","C_crab","C_hanger","C_screw_ln","C_screw_tn","C_anchor","C_tape","C_joint"))materialNeed(section,id,quantity);
                for(String id:List.of("C_guide","C_dowel","C_seal","C_divider"))materialNeed(section,id,perimeter);
                reference(section,name+": каркас и ГКЛ","L_gkl",quantity);
                operation(section,name+": окраска","paint_ceiling",quantity,true);return;
            }
            throw new IllegalArgumentException("Unsupported finish: "+surface+" / "+material);
        }
        BigDecimal sum(String section){return lines.stream().filter(l->l.section().equals(section)).map(CostDetails.Line::amountRub).reduce(BigDecimal.ZERO,BigDecimal::add);}
        CostDetails details(){return new CostDetails(rough,finish,labor,List.copyOf(lines));}
    }
}
