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
    @Test void editedCoefficientsAffectNewCalculationsWithoutChangingOldSnapshotsOrWorkRates(){
        var d=data(Kitchen.defaults(),none());var before=calc(d);
        jdbc.update("update calculation_coefficients set coefficient_value=2 where code='level_comfort'");
        jdbc.update("update calculation_coefficients set coefficient_value=1.25 where code='reserve'");entityManager.clear();
        var after=calc(d);
        var oldMaterial=before.details().lines().stream().filter(l->l.priceCode().equals("average.material.laminate")).findFirst().orElseThrow();
        var newMaterial=after.details().lines().stream().filter(l->l.priceCode().equals("average.material.laminate")).findFirst().orElseThrow();
        assertEquals(0,oldMaterial.coefficient().compareTo(new BigDecimal("1.3")));
        assertEquals(0,newMaterial.coefficient().compareTo(new BigDecimal("2")));
        assertEquals(oldMaterial.quantity(),newMaterial.quantity());
        assertEquals(before.details().lines().stream().filter(l->l.priceCode().equals("average.work.laminate")).toList(),after.details().lines().stream().filter(l->l.priceCode().equals("average.work.laminate")).toList());
        assertEquals(after.total().max().multiply(new BigDecimal("1.25")).setScale(0,java.math.RoundingMode.HALF_UP),after.total().withReserve());
        assertTrue(after.assumptions().stream().anyMatch(v->v.contains("reserve=1.25")));
        jdbc.update("update calculation_coefficients set coefficient_value=0.5 where code='wall_share'");entityManager.clear();
        var smaller=calc(d);
        var oldWall=after.details().lines().stream().filter(l->l.priceCode().equals("average.work.wallpaper")).findFirst().orElseThrow();
        var newWall=smaller.details().lines().stream().filter(l->l.priceCode().equals("average.work.wallpaper")).findFirst().orElseThrow();
        assertTrue(newWall.quantity().compareTo(oldWall.quantity())<0);
        assertEquals(oldWall.unitPriceRub(),newWall.unitPriceRub());
    }
    @Test void finishLevelChangesMaterialsAndTotalButPreservesWorkQuantities() {
        var d=data(Kitchen.defaults(),none());var a=d.apartment();
        java.util.List<String> baseline=null;
        BigDecimal previous=null;
        for (var level : new FinishLevel[]{FinishLevel.BUDGET,FinishLevel.COMFORT,FinishLevel.BUSINESS}) {
            var apartment=new Apartment(a.currentState(),a.targetState(),level,a.areaM2(),a.ceilingHeight(),a.floor(),a.walls(),a.ceiling(),a.doors(),a.demolition(),a.wallPreparation(),a.floorPreparation(),a.electrical());
            var result=calc(new RefinementData(apartment,d.rooms(),false,d.kitchens(),none(),Set.of()));
            var works=result.details().lines().stream()
                    .filter(l->l.priceCode().startsWith("average.work.")||l.priceCode().startsWith("ref.L_"))
                    .map(l->l.priceCode()+":"+l.quantity().stripTrailingZeros().toPlainString()).sorted().toList();
            assertFalse(works.isEmpty());
            if(baseline==null)baseline=works;else assertEquals(baseline,works);
            var total=result.details().lines().stream().map(l->l.amountRub()).reduce(BigDecimal.ZERO,BigDecimal::add);
            if(previous!=null)assertTrue(total.compareTo(previous)>0);
            previous=total;
            assertTrue(result.details().lines().stream().anyMatch(l->l.priceCode().equals("ref.D_ordinary_"+level.name().toLowerCase(java.util.Locale.ROOT))));
        }
    }

    @Test void importedAveragesAreSeparateAndDoNotDoubleChargeLaminateUnderlay(){
        var result=calc(data(Kitchen.defaults(),none()));
        var labor=result.details().lines().stream().filter(l->l.priceCode().equals("average.work.laminate")).findFirst().orElseThrow();
        var material=result.details().lines().stream().filter(l->l.priceCode().equals("average.material.laminate")).findFirst().orElseThrow();
        assertEquals(new BigDecimal("1090.00"),labor.unitPriceRub());
        assertEquals(new BigDecimal("1516.88"),material.unitPriceRub());
        assertEquals(0,labor.coefficient().compareTo(BigDecimal.ONE));
        assertEquals(0,material.coefficient().compareTo(new BigDecimal("1.3")));
        assertTrue(material.source().contains("16 городам"));
        assertTrue(material.source().contains("подложки"));
        assertTrue(result.details().lines().stream().noneMatch(l->l.priceCode().equals("ref.F_underlay_lam")));
    }
    @Test void workbookApplianceInstallationUsesIndividualRatesAndNoBundleDuplicate(){
        var result=calc(data(new Kitchen("keep",null,"unknown","unknown","hob",true,true,true,true),none()));
        var expected=Map.of("ref.L_kitchen_fridge",2040,"ref.L_kitchen_hob",2040,"ref.L_kitchen_oven",1840,"ref.L_kitchen_hood",2090,"ref.L_kitchen_dishwasher",2240);
        for(var entry:expected.entrySet()){
            var lines=result.details().lines().stream().filter(l->l.priceCode().equals(entry.getKey())).toList();
            assertEquals(1,lines.size());assertEquals(entry.getValue().intValue(),lines.getFirst().amountRub().intValueExact());
            assertEquals(0,lines.getFirst().coefficient().compareTo(BigDecimal.ONE));
        }
        assertFalse(result.details().lines().stream().anyMatch(l->l.priceCode().equals("ref.L_kitchen_tech")));
        assertTrue(result.details().lines().stream().anyMatch(l->l.priceCode().equals("ref.K_tech1_comfort")));
    }
    @Test void premiumKitsUseTheirOwnPriceWithoutApplyingClassAgain(){
        var d=data(Kitchen.defaults(),none());var a=d.apartment();
        var premium=new Apartment(a.currentState(),a.targetState(),FinishLevel.BUSINESS,a.areaM2(),a.ceilingHeight(),a.floor(),a.walls(),a.ceiling(),a.doors(),a.demolition(),a.wallPreparation(),a.floorPreparation(),a.electrical());
        var result=calc(new RefinementData(premium,d.rooms(),false,d.kitchens(),none(),Set.of()));
        var door=result.details().lines().stream().filter(l->l.priceCode().equals("ref.D_ordinary_business")).findFirst().orElseThrow();
        assertEquals(0,door.coefficient().compareTo(BigDecimal.ONE));assertEquals(new BigDecimal("42150"),door.amountRub());
        var cabinets=result.details().lines().stream().filter(l->l.priceCode().equals("ref.K_cabinets_business")).findFirst().orElseThrow();
        assertEquals(new BigDecimal("330000"),cabinets.amountRub());
        assertEquals(0,cabinets.quantity().compareTo(new BigDecimal("100")));
        assertTrue(result.details().lines().stream().anyMatch(l->l.priceCode().equals("ref.L_kitchen_assembly")));
    }
    @Test void removingImportedRateFailsOnlyWhenItIsNeededAndDoesNotUseLegacyFallback(){
        jdbc.update("delete from price_matrix where code='ref.K_tech6_budget'");entityManager.clear();
        assertNotNull(calc(data(Kitchen.defaults(),none()))); // Microwave is not offered in the current form.
        jdbc.update("delete from price_matrix where code='average.material.laminate'");entityManager.clear();
        assertThrows(IllegalStateException.class,()->calc(data(Kitchen.defaults(),none())));
    }
    @Test void packageNeedsAreAggregatedBeforeRoundingAcrossRooms(){
        var d=data(Kitchen.defaults(),none());var a=d.apartment();
        var rooms=List.of(new Room(UUID.randomUUID(),"living","А",new BigDecimal("20"),"vinyl","inherit","inherit",false),new Room(UUID.randomUUID(),"living","Б",new BigDecimal("48"),"vinyl","inherit","inherit",false));
        var result=calc(new RefinementData(a,rooms,false,Map.of(),none(),Set.of()));
        var underlay=result.details().lines().stream().filter(l->l.priceCode().equals("ref.F_underlay_spc")).toList();
        assertEquals(1,underlay.size());assertEquals(0,underlay.getFirst().quantity().compareTo(new BigDecimal("8"))); // ceil(68 * 1.05 / 10), not 3 + 6 separate purchases.
        assertEquals(0,underlay.getFirst().coefficient().compareTo(BigDecimal.ONE));
    }
    @Test void newPreparationRatesStillProduceRoughAndDryingPhases(){
        var result=calc(data(Kitchen.defaults(),none()));
        assertTrue(result.details().lines().stream().anyMatch(l->l.priceCode().equals("average.work.screed")));
        assertTrue(result.timePlan().phases().stream().anyMatch(p->p.id().equals("rough")));
        assertTrue(result.timePlan().phases().stream().anyMatch(p->p.id().equals("drying")));
    }
    @Test void verifiedPricesChangeExplanationButDoNotClaimVerifiedGeometry(){
        var input=data(Kitchen.defaults(),none());var before=calc(input);
        assertTrue(before.assumptions().stream().anyMatch(n->n.contains("ещё не проверенные администратором")));
        jdbc.update("update price_matrix set verified=true");entityManager.clear();
        var after=calc(input);
        assertTrue(after.assumptions().stream().anyMatch(n->n.contains("проверенные")&&n.contains("коэффициенты остаются допущениями")));
        assertFalse(after.assumptions().stream().anyMatch(n->n.contains("ещё не проверенные администратором")));
        assertTrue(after.demonstration());assertEquals(before.total(),after.total());assertNotEquals(before.pricingVersion(),after.pricingVersion());
    }
    @Test void lineItemsReproduceTotalAndSplitExactly(){
        var result=calc(data(Kitchen.defaults(),none()));
        BigDecimal sum=BigDecimal.ZERO;
        for(var line:result.details().lines()){
            assertEquals(line.amountRub(),line.quantity().multiply(line.unitPriceRub()).multiply(line.coefficient()).setScale(0,java.math.RoundingMode.HALF_UP));
            sum=sum.add(line.amountRub());
        }
        assertEquals(result.total().expected(),sum);
        assertEquals(sum,result.details().roughMaterials().add(result.details().finishMaterials()).add(result.details().labor()));
        var wall=result.details().lines().stream().filter(l->l.name().equals("Комната: стены: материалы")).findFirst().orElseThrow();
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
                var line=result.details().lines().stream().filter(l->l.name().equals("Санузел: стены: материалы")).findFirst().orElseThrow();
                // Explicit operation prices replace the old tile/paint multiplier; class applies only to materials.
                assertEquals(0,line.coefficient().compareTo(new BigDecimal("1.3")),type+" / "+wall);
                var living=result.details().lines().stream().filter(l->l.name().equals("Комната: стены: материалы")).findFirst().orElseThrow();
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
        jdbc.update("update price_matrix set unit_price_rub=unit_price_rub*2 where code='average.material.laminate'");
        entityManager.clear(); // Simulate the next request after an external catalog edit.
        var after=calc(input);
        assertTrue(after.total().expected().compareTo(before.total().expected())>0);
        assertNotEquals(before.pricingVersion(),after.pricingVersion());
        assertEquals(before.details().lines().stream().filter(l->l.priceCode().equals("average.material.laminate")).findFirst().orElseThrow().unitPriceRub().multiply(new BigDecimal("2")),after.details().lines().stream().filter(l->l.priceCode().equals("average.material.laminate")).findFirst().orElseThrow().unitPriceRub());
        assertEquals(500,jdbc.queryForObject("select count(*) from price_matrix",Integer.class));
    }
    @Test void missingPriceFailsInsteadOfFallingBackToHiddenMock(){
        jdbc.update("delete from price_matrix where code='average.work.wallpaper'");
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
        assertEquals(yes.timePlan().totalDays(),yes.durationMinDays());
    }

    @Test void engineeringUsesCatalogAndKeepsClassSpecificPricesWithoutExtraCoefficient(){
        var result=calc(data(Kitchen.defaults(),none()));
        assertTrue(result.details().lines().stream().noneMatch(l->Set.of("electrical","plumbing").contains(l.priceCode())));
        var sockets=result.details().lines().stream().filter(l->l.name().equals("Комната: розетки")).findFirst().orElseThrow();
        assertEquals("ref.E_socket_dry_comfort",sockets.priceCode());
        assertEquals(0,sockets.quantity().compareTo(new BigDecimal("14")));
        assertEquals(new BigDecimal("9100"),sockets.amountRub());
        assertEquals(0,sockets.coefficient().compareTo(BigDecimal.ONE));
        var cable=result.details().lines().stream().filter(l->l.priceCode().equals("ref.E_cable_socket")).toList();
        assertEquals(1,cable.size());assertEquals(0,cable.getFirst().quantity().compareTo(new BigDecimal("2"))); // ceil(68*2*1.05/100)
        var before=result.total().expected();
        jdbc.update("update price_matrix set unit_price_rub=unit_price_rub+100 where code='ref.E_socket_dry_comfort'");entityManager.clear();
        assertEquals(new BigDecimal("1700"),calc(data(Kitchen.defaults(),none())).total().expected().subtract(before));
    }
    @Test void keepElectricalSkipsAllElectricalCatalogRowsAndMissingUsedRateFails(){
        var d=data(Kitchen.defaults(),none());var a=d.apartment();
        var keep=new Apartment(a.currentState(),a.targetState(),a.finishLevel(),a.areaM2(),null,a.floor(),a.walls(),a.ceiling(),a.doors(),a.demolition(),a.wallPreparation(),a.floorPreparation(),"keep");
        var result=calc(new RefinementData(keep,d.rooms(),false,d.kitchens(),none(),Set.of()));
        assertTrue(result.details().lines().stream().noneMatch(l->l.priceCode().startsWith("ref.E_")||l.priceCode().equals("ref.L_cable")));
        jdbc.update("delete from price_matrix where code='ref.E_socket_dry_comfort'");entityManager.clear();
        assertThrows(IllegalStateException.class,()->calc(d));
    }
    @Test void finishOnlyHasSameWaterRoutesButNoFixturesOrTheirInstallation(){
        var d=data(Kitchen.defaults(),none());var a=d.apartment();
        var rooms=List.of(new Room(UUID.randomUUID(),"combined_bathroom","Санузел",new BigDecimal("8"),"inherit","inherit","inherit",false),new Room(UUID.randomUUID(),"living","Комната",new BigDecimal("60"),"inherit","inherit","inherit",false));
        var finish=new Apartment(a.currentState(),TargetState.FINISH_ONLY,a.finishLevel(),a.areaM2(),null,a.floor(),a.walls(),a.ceiling(),a.doors(),a.demolition(),a.wallPreparation(),a.floorPreparation(),a.electrical());
        var ready=calc(new RefinementData(a,rooms,false,Map.of(),none(),Set.of()));
        var shell=calc(new RefinementData(finish,rooms,false,Map.of(),none(),Set.of()));
        var pipes=ready.details().lines().stream().filter(l->l.priceCode().equals("ref.L_pipe_water")).findFirst().orElseThrow();
        assertEquals(pipes,shell.details().lines().stream().filter(l->l.priceCode().equals("ref.L_pipe_water")).findFirst().orElseThrow());
        assertTrue(shell.details().lines().stream().noneMatch(l->l.priceCode().startsWith("ref.A_")||Set.of("ref.L_wc","ref.L_bath","ref.L_basin_single").contains(l.priceCode())));
        for(String code:List.of("ref.A_bath_comfort","ref.A_basin_comfort","ref.A_wc_floor_comfort"))assertEquals(1,ready.details().lines().stream().filter(l->l.priceCode().equals(code)).count());
        assertTrue(ready.total().expected().compareTo(shell.total().expected())>0);
    }
    @Test void partialElectricalHalvesWorkVolumesButMaterialsRoundAtProjectLevel(){
        var d=data(Kitchen.defaults(),none());var a=d.apartment();
        var partial=new Apartment(a.currentState(),a.targetState(),a.finishLevel(),a.areaM2(),null,a.floor(),a.walls(),a.ceiling(),a.doors(),a.demolition(),a.wallPreparation(),a.floorPreparation(),"partial");
        var full=calc(d);var half=calc(new RefinementData(partial,d.rooms(),false,d.kitchens(),none(),Set.of()));
        for(String code:List.of("ref.L_cable","ref.L_backbox","ref.L_chase_other")){
            var all=full.details().lines().stream().filter(l->l.priceCode().equals(code)).map(l->l.quantity()).reduce(BigDecimal.ZERO,BigDecimal::add);
            var part=half.details().lines().stream().filter(l->l.priceCode().equals(code)).map(l->l.quantity()).reduce(BigDecimal.ZERO,BigDecimal::add);
            assertEquals(0,all.multiply(new BigDecimal("0.5")).compareTo(part));
        }
    }

    @Test void spbKitchenIncludesSinkOnceAndAssemblyIsSeparateWithoutClassMultiplier(){
        for(String facade:List.of("plastic","enamel")){
            var k=new Kitchen("new",new BigDecimal("3"),facade,"laminated","none",false,false,false,false);
            var result=calc(data(k,none()));
            var kit=result.details().lines().stream().filter(l->l.priceCode().equals("spb.kitchen."+facade)).findFirst().orElseThrow();
            assertEquals(new BigDecimal(facade.equals("plastic")?"192000":"222000"),kit.amountRub());
            assertEquals(0,kit.coefficient().compareTo(BigDecimal.ONE));
            assertEquals(new BigDecimal("9450"),result.details().lines().stream().filter(l->l.priceCode().equals("spb.kitchen.assembly")).findFirst().orElseThrow().amountRub());
            assertTrue(result.details().lines().stream().noneMatch(l->l.priceCode().startsWith("ref.K_sink_")||l.priceCode().startsWith("ref.K_cabinets_")||l.priceCode().equals("joinery")));
            assertEquals(1,result.details().lines().stream().filter(l->l.priceCode().equals("ref.L_kitchen_sink")).count());
        }
    }
    @Test void stoneCannotBeAddedOnTopOfBundledPostformingAndKeepDoesNotBuyKitchen(){
        var stone=new Kitchen("new",new BigDecimal("3"),"plastic","stone","none",false,false,false,false);
        var result=calc(data(stone,none()));
        assertTrue(result.details().lines().stream().noneMatch(l->l.priceCode().startsWith("spb.")));
        assertTrue(result.assumptions().stream().anyMatch(n->n.contains("цена обычной столешницы")));
        var keep=new Kitchen("keep",new BigDecimal("3"),"plastic","laminated","none",false,false,false,false);
        var kept=calc(data(keep,none()));assertEquals(0,kept.kitchen().expected().signum());
        assertTrue(kept.details().lines().stream().anyMatch(l->l.priceCode().equals("ref.K_sink_comfort")));
    }
    @Test void spbExteriorUsesInstalledPricesOnceAndExplicitRefusalSkipsThem(){
        var warm=new Exterior(new BigDecimal("4"),"new","yes","tile","paint","none",false,false);
        var result=calc(data(Kitchen.defaults(),new Exteriors("loggia",warm, warm)));
        var glazing=result.details().lines().stream().filter(l->l.priceCode().equals("spb.glazing.warm")).findFirst().orElseThrow();
        assertEquals(new BigDecimal("6666.67"),glazing.unitPriceRub());assertEquals(0,glazing.coefficient().compareTo(BigDecimal.ONE));
        var floor=result.details().lines().stream().filter(l->l.priceCode().equals("spb.insulation.floor50")).findFirst().orElseThrow();assertEquals(new BigDecimal("4000"),floor.amountRub());
        assertTrue(result.details().lines().stream().noneMatch(l->Set.of("glazing","preparation","spb.insulation.wall30").contains(l.priceCode())));
        var cold=new Exterior(new BigDecimal("4"),"new","no","tile","paint","none",false,false);
        var coldResult=calc(data(Kitchen.defaults(),new Exteriors("loggia",cold,cold)));
        assertTrue(coldResult.details().lines().stream().noneMatch(l->l.priceCode().startsWith("spb.insulation.")));
        assertTrue(coldResult.details().lines().stream().anyMatch(l->l.priceCode().equals("spb.glazing.cold")));
        var no=new Exterior(new BigDecimal("4"),"keep","no","tile","paint","none",false,false);
        assertTrue(calc(data(Kitchen.defaults(),new Exteriors("loggia",no,no))).details().lines().stream().noneMatch(l->l.priceCode().startsWith("spb.")));
        jdbc.update("delete from price_matrix where code='spb.glazing.warm'");entityManager.clear();
        assertThrows(IllegalStateException.class,()->calc(data(Kitchen.defaults(),new Exteriors("loggia",warm,warm))));
    }
}
