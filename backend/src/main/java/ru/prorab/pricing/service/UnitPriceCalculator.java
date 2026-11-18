package ru.prorab.pricing.service;

import org.springframework.stereotype.Component;
import ru.prorab.pricing.dto.CostDetails;
import ru.prorab.pricing.model.CostCategory;
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
    public static final String VERSION="catalog-pricing-8";
    private final PriceCatalog catalog;
    private final CoefficientCatalog coefficients;
    private final ru.prorab.execution.service.TimePlanner timePlanner;
    public UnitPriceCalculator(PriceCatalog catalog,ru.prorab.execution.service.TimePlanner timePlanner,CoefficientCatalog coefficients){this.coefficients=coefficients;this.catalog=catalog;this.timePlanner=timePlanner;}
    public RefinedEstimate calculate(UUID id,long revision,RefinementData d,AreaAllocation allocation){
        if(!allocation.complete())throw new IllegalArgumentException("Incomplete area allocation");
        Apartment a=d.apartment();
        Ledger bill=new Ledger(catalog.snapshot(),a.finishLevel(),coefficients.snapshot());
        List<String> notes=new ArrayList<>(allocation.assumptions());
        notes.add("Цены отделки — отдельно работа и материалы. Сопоставимые работы обновлены по Сбор_данных_для_калькулятора.xlsx (прайсы Лемана ПРО, Москва); остальные ставки сохранены. Выбор города не используется.");
        notes.add("Источник каждой ставки сохранён в строке сметы. Часть материалов и работ использует прежние нормативные ориентиры по 16 городам. Цены нового файла — отдельные предложения, не новая среднерыночная выборка; дата из файла не означает автоматическую онлайн-проверку.");
        notes.add("Для городских материалов без цен по классам сохранён оценочный множитель: значения классов берутся из настроек админки и сохранены ниже. Работы идут без множителя. Комплекты дверей, кухни и техника уже выбраны по классу: повторного множителя нет.");
        notes.add("Нет обмеров периметра и проёмов: помещение условно квадратное; стены = 4 × √площадь × высота × доля стен из настроек. Высота без ввода — 2,7 м. Доля частичных работ берётся из настроек.");
        notes.add("Неизвестная отделка: ламинат, обои, натяжной потолок; санузлы: плитка на полу и стенах. Демонтаж без данных о прежнем покрытии: обои, ламинат, натяжной потолок. Новое покрытие не определяет старое.");
        notes.add("Электрика и сантехника: материалы и монтаж по сводному справочнику. Число розеток сохранено: округление площади / 4 вверх; частичные работы — доля объёма из настроек. Кабель розеток условно 2 м на м², штробы — 40% кабеля (правила сводного файла). Щит, выделенные линии приборов и замена вводного узла воды отдельно не включены без выбора этих работ.");
        notes.add("Границы бюджета и резерв сверх максимума определяются коэффициентами из настроек. Сроки и технологические паузы остаются предварительными. Доставка, вывоз мусора и перепланировка отдельно не оценены.");
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
            BigDecimal surface=walls(area.areaM2(),height,bill.coefficients);
            bill.finish("repair",label+": пол","floor",floor,area.areaM2());
            bill.finish("repair",label+": стены","wall",walls,surface);
            bill.finish("repair",label+": потолок","ceiling",ceiling,area.areaM2());
            BigDecimal prepare=switch(a.currentState()){case WHITE_BOX->BigDecimal.ZERO;case LIVED_IN->bill.coefficients.get("lived_share");default->BigDecimal.ONE;};
            bill.operation("repair",label+": подготовка стен","plaster_wall",surface.multiply(work(a.wallPreparation(),prepare,"ready",bill.coefficients)),false);
            bill.operation("repair",label+": подготовка пола","screed",area.areaM2().multiply(work(a.floorPreparation(),prepare,"ready",bill.coefficients)),false);
            BigDecimal demolish=switch(a.currentState()){case OLD_FINISH->BigDecimal.ONE;case LIVED_IN->bill.coefficients.get("lived_share");default->BigDecimal.ZERO;};
            BigDecimal demo=work(a.demolition(),demolish,"none",bill.coefficients);
            bill.reference("repair",label+": демонтаж стен","L_demo_paper",surface.multiply(demo));
            bill.reference("repair",label+": демонтаж пола","L_demo_floor",area.areaM2().multiply(demo));
            bill.reference("repair",label+": демонтаж потолка","L_demo_c_stretch",area.areaM2().multiply(demo));
            BigDecimal electric=switch(a.currentState()){case WHITE_BOX,LIVED_IN->BigDecimal.ZERO;default->BigDecimal.ONE;};
            BigDecimal electricalShare=work(a.electrical(),electric,"keep",bill.coefficients);
            bill.electrical("repair",label,area.areaM2().divide(n("4"),0,RoundingMode.CEILING).multiply(electricalShare),area.areaM2().multiply(n("2")).multiply(electricalShare),wet,false);
            bill.plumbing(label,area.type(),a.areaM2(),a.targetState()!=TargetState.FINISH_ONLY,bundledKitchen(d.kitchens().get(area.id()),a.targetState()!=TargetState.FINISH_ONLY));
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
                if(bundledKitchen(k,equipped)){
                    bill.direct("kitchen",label+": гарнитур с мойкой, смесителем и постформингом","spb.kitchen."+k.facade(),length,BigDecimal.ONE);
                    bill.direct("kitchen",label+": сборка гарнитура — от, другой подрядчик","spb.kitchen.assembly",length,BigDecimal.ONE);
                    notes.add(label+": комплект СПб с фасадами "+(k.facade().equals("plastic")?"пластик":"эмаль")+" включает мойку, смеситель и обычную столешницу. Мойка со смесителем повторно не начислена; их подключение и сифон отдельно. Сборка — стартовая ставка другого подрядчика. Цена типового комплекта пересчитана линейно по длине, класс повторно не умножается.");
                }else if(custom){
                    bill.add("kitchen",label+": гарнитур с выбранными фасадами/столешницей (укрупнённая оценка)","joinery",length.divide(n("3"),8,RoundingMode.HALF_UP),material(k.facade(),bill.coefficients).multiply(material(k.countertop(),bill.coefficients)));
                    notes.add(label+": для каменной столешницы есть отдельный прайс, но цена обычной столешницы внутри гарнитура не выделена. Поэтому сохранена прежняя укрупнённая оценка гарнитура с монтажом; комплект с постформингом и камень сверху не начисляются.");
                }else{
                    bill.reference("kitchen",label+": гарнитур","K_cabinets_"+bill.grade,length.divide(n("3"),8,RoundingMode.HALF_UP).divide(n("0.01"),0,RoundingMode.CEILING));
                    bill.reference("kitchen",label+": сборка гарнитура","L_kitchen_assembly",length);
                }
                if(k.lengthM()==null)notes.add(label+": длина гарнитура условно 3 м, не обмер.");
            }
            String stove=k.stove()==null?(equipped?"hob":"none"):k.stove();
            if(stove.equals("cooker"))bill.add("kitchen",label+": плита с духовкой (оценочная ставка)","equipment",BigDecimal.ONE,n("1.5"));
            else if(stove.equals("hob"))bill.appliance(label,"панель",2);
            if(!stove.equals("cooker")&&selected(k.oven(),equipped))bill.appliance(label,"духовка",3);
            if(selected(k.refrigerator(),equipped))bill.appliance(label,"холодильник",1);
            if(selected(k.hood(),equipped))bill.appliance(label,"вытяжка",4);
            if(selected(k.dishwasher(),equipped))bill.appliance(label,"посудомоечная машина",5);
        }
        notes.add("Сантехника: совмещённый санузел — раковина, ванна и унитаз; ванная — раковина и ванна; туалет — унитаз; кухня — мойка. При цели «Только отделка» учитываются только трубы и выводы, без приборов и их монтажа; прежний множитель 0,35 не используется. Длины трасс оценены по правилам сводного файла с масштабом √(площадь квартиры / 60), а не по обмерам. Дополнительная техника и её трассы не добавляются автоматически.");
        notes.add("Остекление, утепление и кухни пластик/эмаль с обычной столешницей — прайсы СПб с источниками и датами; город в приложении не выбирается. Отдельная плита, кухня с каменной столешницей и основная мебель сохраняют прежние ставки. Стартовые цены «от» не являются фиксированным предложением на этот объект.");
        notes.add("Кухонная техника — отдельные цены по классу. Монтаж панели, духовки, вытяжки, холодильника и посудомойки рассчитан по отдельным ставкам из Excel. Отдельно стоящая плита сохраняет прежнюю оценочную ставку и включает духовку.");
        notes.add("Натяжной потолок: полотно отдельно; профиль и крепёж включены в комплекс монтажа. Комплексные услуги (в том числе остекление и утепление) отнесены к работам/услугам вместе с включёнными материалами: раздельная стоимость поставщиком не раскрыта. Пакетные материалы округляются после объединения потребности по проекту; упаковка оплачивается один раз, остаток используется следующими помещениями. Световые узлы потолка требуют уточнения и отдельно не добавлены.");
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
        notes.add("Коэффициенты на момент расчёта: "+bill.coefficients.description());
        return new RefinedEstimate(id,revision,true,bill.prices.version(),VERSION,AreaAllocator.VERSION,
                totals(repair,bill.coefficients),totals(kitchen,bill.coefficients),totals(repair.add(kitchen),bill.coefficients),balcony,loggia,time.totalDays(),(int)Math.ceil(time.totalDays()*1.2),
                List.of("Работы и материалы по справочникам; комплекты по классу без повторного коэффициента", "Состав работ зависит от исходного состояния, цели и явных отказов"),List.copyOf(notes),bill.details(),time);
    }
    private void exterior(Ledger bill,String section,Exterior e,String defaultArea,BigDecimal height,List<String> notes){
        String label=section.equals("balcony")?"Балкон":"Лоджия";
        BigDecimal area=e.areaM2()==null?n(defaultArea):e.areaM2();
        if(e.areaM2()==null)notes.add(label+": расчётная площадь "+defaultArea+" м² (не обмер)");
        bill.finish(section,label+": пол","floor",e.floor(),area);
        bill.finish(section,label+": стены","wall",e.walls(),walls(area,height,bill.coefficients));
        if(!e.ceiling().equals("none"))bill.finish(section,label+": потолок","ceiling",e.ceiling(),area);
        boolean insulated=!e.insulation().equals("no");
        if(insulated){
            bill.direct(section,label+": утепление стен и потолка ЭППС 50 мм — от","spb.insulation.wall50",walls(area,height,bill.coefficients).add(area),BigDecimal.ONE);
            bill.direct(section,label+": утепление пола с ЦСП","spb.insulation.floor50",area,BigDecimal.ONE);
            notes.add(label+": для расчёта утепления принят ЭППС 50 мм: стены и потолок отдельно от пола. Материал и работа уже включены; декоративная отделка считается отдельно. Толщина — допущение модели, не теплотехнический подбор; стены оценены по прежней формуле без обмеров.");
        }
        if(e.glazing().equals("new")){
            bill.direct(section,label+": "+(insulated?"тёплое":"холодное")+" остекление с монтажом","spb.glazing."+(insulated?"warm":"cold"),area.sqrt(MathContext.DECIMAL64).multiply(height),BigDecimal.ONE);
            notes.add(label+": тип остекления не запрашивается; расчётное допущение — тёплое при утеплении (включая неизвестное), холодное при отказе от утепления. Площадь остекления условно √площадь пола × высота. Ставки взяты из разных типоразмеров и скидочных предложений, поэтому тёплый вариант может быть дешевле холодного; это не сравнение одинаковых заказов.");
        }
        if(selected(e.lighting(),true))bill.electrical(section,label+": освещение",BigDecimal.ONE,area,true,true);
        if(selected(e.sockets(),true))bill.electrical(section,label+": розетка",BigDecimal.ONE,area.multiply(n("2")),true,false);
        notes.add(label+": неизвестное остекление сохраняется; неизвестные утепление, потолок, свет и розетка включаются по нормативу.");
    }
    private static boolean bundledKitchen(Kitchen k,boolean equipped){
        return k!=null&&(k.cabinets().equals("new")||k.cabinets().equals("unknown")&&equipped)&&Set.of("plastic","enamel").contains(k.facade())&&Set.of("unknown","laminated").contains(k.countertop());
    }
    private static BigDecimal walls(BigDecimal area,BigDecimal height,CoefficientCatalog.Snapshot c){return area.sqrt(MathContext.DECIMAL64).multiply(n("4")).multiply(height).multiply(c.get("wall_share"));}
    private static String effective(String value,String general){return value.equals("inherit")?general:value;}
    private static boolean selected(Boolean v,boolean fallback){return v==null?fallback:v;}
    private static BigDecimal work(String v,BigDecimal fallback,String excluded,CoefficientCatalog.Snapshot c){if(v.equals(excluded)||v.equals("none"))return BigDecimal.ZERO;if(v.equals("unknown"))return fallback;return Set.of("partial","local").contains(v)?c.get("partial_share"):BigDecimal.ONE;}
    private static BigDecimal material(String code,CoefficientCatalog.Snapshot c){return switch(code){case "vinyl","paint","plastic"->c.get("material_medium");case "tile","plaster","drywall"->c.get("material_high");case "parquet","stone","enamel"->c.get("material_premium");default->BigDecimal.ONE;};}
    private static BigDecimal n(String value){return new BigDecimal(value);}
    private static BigDecimal money(BigDecimal value){return value.setScale(0,RoundingMode.HALF_UP);}
    private static Totals totals(BigDecimal value,CoefficientCatalog.Snapshot c){BigDecimal max=money(value.multiply(c.get("budget_max")));return new Totals(money(value.multiply(c.get("budget_min"))),max,value,money(max.multiply(c.get("reserve"))));}
    private static class Ledger {
        final PriceCatalog.Snapshot prices;
        final CoefficientCatalog.Snapshot coefficients;
        final BigDecimal level;
        final String grade;
        final List<CostDetails.Line> lines=new ArrayList<>();
        final Map<CostCategory,BigDecimal[]> groups=new EnumMap<>(CostCategory.class);
        record MaterialNeed(String section,String id,BigDecimal amount){}
        final List<MaterialNeed> materials=new ArrayList<>();
        static final Map<String,com.fasterxml.jackson.databind.JsonNode> metadata=ru.prorab.pricing.model.ImportedPrices.ROWS.stream().collect(java.util.stream.Collectors.toMap(r->r.get("code").asText(),r->r));
        BigDecimal rough=BigDecimal.ZERO,finish=BigDecimal.ZERO,labor=BigDecimal.ZERO;
        Ledger(PriceCatalog.Snapshot prices,FinishLevel level,CoefficientCatalog.Snapshot coefficients){this.coefficients=coefficients;this.prices=prices;this.grade=level.name().toLowerCase(Locale.ROOT);this.level=coefficients.get("level_"+this.grade);}
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
            var group=groups.computeIfAbsent(CostCategory.forPrice(code,section),k->new BigDecimal[]{BigDecimal.ZERO,BigDecimal.ZERO});
            group[0]=group[0].add(l);group[1]=group[1].add(amount.subtract(l));
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
        void electrical(String section,String label,BigDecimal points,BigDecimal cable,boolean wet,boolean light){
            if(points.signum()==0)return;
            materialNeed(section,light?"E_cable_light":"E_cable_socket",cable);
            materialNeed(section,"E_conduit",cable);
            BigDecimal clips=cable.divide(n("0.5"),0,RoundingMode.CEILING);
            materialNeed(section,"E_clip",clips);materialNeed(section,"E_clip_dowel",clips);
            reference(section,label+": прокладка кабеля","L_cable",cable);
            BigDecimal chase=cable.multiply(n("0.4"));
            reference(section,label+": трассы в неуточнённых стенах","L_chase_other",chase);
            reference(section,label+": заделка штроб","L_chase_fill",chase);
            materialNeed(section,"E_chase_mix",chase.multiply(n("0.025")).multiply(n("0.025")));
            if(light){
                reference(section,label+": светильник","E_light_"+grade,points);
                reference(section,label+": монтаж светильника","L_light",points);
            }else{
                materialNeed(section,"E_backbox_unknown",points);
                materialNeed(section,"E_backbox_mix",points);
                reference(section,label+": отверстия под подрозетники","L_box_other",points);
                reference(section,label+": монтаж подрозетников","L_backbox",points);
                reference(section,label+": розетки","E_socket_"+(wet?"wet_":"dry_")+grade,points);
                reference(section,label+": монтаж розеток",wet?"L_socket_wet":"L_socket_dry",points);
            }
        }
        void plumbing(String label,String type,BigDecimal apartmentArea,boolean fixtures,boolean sinkIncluded){
            int basin=Set.of("combined_bathroom","bathroom").contains(type)?1:0;
            int bath=basin,wc=Set.of("combined_bathroom","toilet").contains(type)?1:0,kitchen=type.equals("kitchen")?1:0;
            if(basin+bath+wc+kitchen==0)return;
            BigDecimal scale=apartmentArea.divide(n("60"),12,RoundingMode.HALF_UP).sqrt(MathContext.DECIMAL64);
            BigDecimal cold=n(""+(3*basin+3*bath+2*wc+3*kitchen)).multiply(scale);
            BigDecimal hot=n(""+(3*basin+3*bath+3*kitchen)).multiply(scale);
            BigDecimal sewer50=n(""+(2*(basin+bath+kitchen))).multiply(scale),sewer110=n(""+(2*wc)).multiply(scale);
            BigDecimal waterPoints=n(""+(2*basin+2*bath+wc+2*kitchen)),sewerPoints=n(""+(basin+bath+wc+kitchen));
            materialNeed("repair","P_pipe_c",cold);materialNeed("repair","P_pipe_h",hot);
            materialNeed("repair","P_insulation",cold.add(hot));materialNeed("repair","P_water_clip",cold.add(hot));
            for(String id:List.of("P_water_elbow","P_water_tee","P_water_coupling","P_water_outlet","P_seal_thread"))materialNeed("repair",id,waterPoints);
            reference("repair",label+": монтаж труб воды","L_pipe_water",cold.add(hot));
            reference("repair",label+": выводы воды","L_water_points",waterPoints);
            materialNeed("repair","P_sewer50",sewer50);materialNeed("repair","P_sewer110",sewer110);
            materialNeed("repair","P_sewer_clip",sewer50.add(sewer110));
            for(String id:List.of("P_sewer_bend","P_sewer_tee","P_sewer_cuff"))materialNeed("repair",id,sewerPoints);
            reference("repair",label+": монтаж канализации","L_sewer",sewer50.add(sewer110));
            reference("repair",label+": выводы канализации","L_sewer_points",sewerPoints);
            if(!fixtures)return;
            if(basin>0){
                reference("repair",label+": раковина","A_basin_"+grade,BigDecimal.ONE);
                reference("repair",label+": смеситель раковины","A_basin_mixer_"+grade,BigDecimal.ONE);
                reference("repair",label+": сифон","A_basin_siphon",BigDecimal.ONE);
                reference("repair",label+": подводки смесителя","A_basin_hose",n("2"));
                for(String id:List.of("L_basin_single","L_basin_mixer","L_siphon"))reference("repair",label+": "+metadata.get("ref."+id).get("title").asText(),id,BigDecimal.ONE);
            }
            if(bath>0){
                for(String id:List.of("A_bath_"+grade,"A_bath_drain","A_bath_mixer","L_bath","L_bath_mixer"))reference("repair",label+": "+metadata.get("ref."+id).get("title").asText(),id,BigDecimal.ONE);
            }
            if(wc>0){
                for(String id:List.of("A_wc_floor_"+grade,"A_wc_conn","L_wc"))reference("repair",label+": "+metadata.get("ref."+id).get("title").asText(),id,BigDecimal.ONE);
            }
            if(kitchen>0){
                if(!sinkIncluded)reference("repair",label+": мойка и смеситель","K_sink_"+grade,BigDecimal.ONE);
                reference("repair",label+": сифон мойки","A_basin_siphon",BigDecimal.ONE);
                reference("repair",label+": установка мойки","L_kitchen_sink",BigDecimal.ONE);
            }
        }
        void appliance(String label,String title,int role){
            reference("kitchen",label+": "+title,"K_tech"+role+"_"+grade,BigDecimal.ONE);
            String installation=switch(role){case 1->"L_kitchen_fridge";case 2->"L_kitchen_hob";case 3->"L_kitchen_oven";case 4->"L_kitchen_hood";case 5->"L_kitchen_dishwasher";default->null;};
            if(installation!=null)reference("kitchen",label+": подключение — "+title,installation,BigDecimal.ONE);
            else direct("kitchen",label+": подключение — "+title,"ref.L_kitchen_tech",BigDecimal.ONE,n("0.1666666667"));
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
        CostDetails details(){
            List<CostDetails.Group> rows=new ArrayList<>();
            for(var category:CostCategory.values()){
                var values=groups.getOrDefault(category,new BigDecimal[]{BigDecimal.ZERO,BigDecimal.ZERO});
                if(category==CostCategory.OTHER&&!groups.containsKey(category))continue;
                rows.add(new CostDetails.Group(category.name().toLowerCase(Locale.ROOT),category.title,category.description,values[0],values[1],values[0].add(values[1])));
            }
            return new CostDetails(rough,finish,labor,List.copyOf(lines),List.copyOf(rows));
        }
    }
}
