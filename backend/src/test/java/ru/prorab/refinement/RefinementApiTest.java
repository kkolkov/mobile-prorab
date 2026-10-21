package ru.prorab.refinement;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:refinement-api;MODE=PostgreSQL;DB_CLOSE_DELAY=-1","spring.datasource.driver-class-name=org.h2.Driver","spring.datasource.username=sa","spring.datasource.password="})
@AutoConfigureMockMvc
class RefinementApiTest {
    @org.springframework.test.context.bean.override.mockito.MockitoBean ru.prorab.config.AuthInterceptor authInterceptor;
    @org.junit.jupiter.api.BeforeEach void businessFixtureIdentity() throws Exception {
        org.mockito.Mockito.when(authInterceptor.preHandle(org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.any())).thenAnswer(call->{
            jakarta.servlet.http.HttpServletRequest request=call.getArgument(0);
            String id=request.getHeader("X-Prorab-User");
            if(id!=null)request.setAttribute("userId",java.util.UUID.fromString(id));
            return true;
        });
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean
    ru.prorab.pricing.service.UnitPriceCalculator calculator;
    private JsonNode call(String method,String url,Object body,int status)throws Exception{
        var req=switch(method){case "GET"->get(url);case "PUT"->put(url);default->post(url);};
        if(body!=null)req.contentType("application/json").content(json.writeValueAsString(body));
        return json.readTree(mvc.perform(req).andExpect(status().is(status)).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
    }
    private String create()throws Exception{
        JsonNode p=call("POST","/api/projects/draft",Map.of("areaM2",68),200);String url="/api/projects/"+p.get("projectId").asText();
        p=call("PUT",url+"/steps/2",Map.of("version",p.get("version").asLong(),"currentState","old_finish"),200);
        p=call("PUT",url+"/steps/3",Map.of("version",p.get("version").asLong(),"targetState","move_in_ready"),200);
        p=call("PUT",url+"/steps/5/estimate",Map.of("version",p.get("version").asLong(),"finishLevel","comfort"),200);
        call("POST",url+"/activate?version="+p.get("version").asLong(),null,200);return url+"/refinement";
    }
    private JsonNode save(String url,JsonNode state,String section,JsonNode data)throws Exception{return call("PUT",url+"/"+section,Map.of("version",state.at("/project/version").asLong(),"data",data),200);}
    private JsonNode ready(String url)throws Exception{
        long deadline=System.nanoTime()+5_000_000_000L;
        JsonNode state;
        do{state=call("GET",url,null,200);if(!state.get("calculationStatus").asText().equals("pending"))break;Thread.sleep(20);}while(System.nanoTime()<deadline);
        assertEquals("ready",state.get("calculationStatus").asText(),state.toString());return state;
    }
    @Test void legacyProjectKeepsItsBudgetAndCanExplicitlyUpgradeToUnitPricing()throws Exception{
        String url=create();String id=url.split("/")[3];
        jdbc.update("update projects set estimate_details_json=null, budget_min_rub=100000, budget_max_rub=200000 where project_id=?",UUID.fromString(id));
        JsonNode old=call("GET",url,null,200);
        assertEquals("legacy-demo",old.at("/activeEstimate/pricingVersion").asText());
        assertEquals(100000,old.at("/project/budgetMinRub").asInt());
        assertTrue(old.at("/activeEstimate/details").isNull());
        call("POST",url+"/calculate",Map.of("version",old.at("/project/version").asLong()),200);
        JsonNode candidate=ready(url);
        assertEquals(100000,candidate.at("/project/budgetMinRub").asInt());
        assertEquals("unit-pricing-3",candidate.at("/candidateEstimate/algorithmVersion").asText());
        call("POST",url+"/apply",Map.of("version",candidate.at("/project/version").asLong(),"estimateId",candidate.at("/candidateEstimate/id").asText()),200);
        JsonNode reloaded=call("GET",url,null,200);
        assertEquals(candidate.get("candidateEstimate"),reloaded.get("activeEstimate"));
        assertEquals(reloaded.get("activeEstimate"),reloaded.at("/project/estimateDetails"));
    }
    @Test void preparationIsIdempotentKitchenAvailableFirstAndOpeningDoesNotRefine()throws Exception{
        String url=create();JsonNode a=call("GET",url,null,200),b=call("GET",url,null,200);
        assertEquals(a.at("/project/estimateDetails"),a.get("activeEstimate"));
        assertTrue(a.at("/activeEstimate/details/lines").size()>0);
        assertEquals(a.get("data"),b.get("data"));assertEquals(4,a.at("/data/rooms").size());assertEquals(1,a.at("/data/kitchens").size());assertEquals(0,a.at("/data/completedSections").size());
        JsonNode unchanged=save(url,a,"kitchen",a.at("/data/kitchens"));assertEquals(0,unchanged.get("revision").asInt());assertEquals("not_requested",unchanged.get("calculationStatus").asText());
    }
    @Test void confirmingNoExteriorRepairCompletesSectionWithoutRecalculation()throws Exception{
        String url=create();JsonNode before=call("GET",url,null,200);
        assertEquals("none",before.at("/data/exteriors/presence").asText());
        assertEquals(0,before.at("/data/completedSections").size());
        JsonNode saved=save(url,before,"exteriors",before.at("/data/exteriors"));
        assertTrue(saved.at("/data/completedSections").toString().contains("exteriors"));
        assertEquals(before.get("revision"),saved.get("revision"));
        assertEquals(before.get("calculationStatus"),saved.get("calculationStatus"));
        assertEquals(before.get("activeEstimate"),saved.get("activeEstimate"));
        assertEquals(before.get("candidateEstimate"),saved.get("candidateEstimate"));
        assertTrue(saved.at("/project/version").asLong()>before.at("/project/version").asLong());
        JsonNode loaded=call("GET",url,null,200);
        assertEquals(saved.get("data"),loaded.get("data"));
        JsonNode repeated=save(url,loaded,"exteriors",loaded.at("/data/exteriors"));
        assertEquals(loaded.at("/project/version"),repeated.at("/project/version"));
        call("PUT",url+"/exteriors",Map.of("version",before.at("/project/version").asLong(),"data",before.at("/data/exteriors")),409);
    }
    @Test void areaAndAutomaticCompositionChangeAtomicallyAndActiveEstimateWaitsForApply()throws Exception{
        String url=create();JsonNode original=call("GET",url,null,200);ObjectNode apartment=original.at("/data/apartment").deepCopy();apartment.put("areaM2",75);
        JsonNode saved=save(url,original,"apartment",apartment);assertEquals(5,saved.at("/data/rooms").size());assertEquals(original.at("/project/budgetMinRub"),saved.at("/project/budgetMinRub"));
        JsonNode current=ready(url);assertEquals(1,current.get("revision").asLong());assertTrue(current.at("/candidateEstimate/demonstration").asBoolean());
        JsonNode noop=save(url,current,"apartment",current.at("/data/apartment"));assertEquals(current.at("/candidateEstimate/id"),noop.at("/candidateEstimate/id"));
        Map<String,Object> apply=Map.of("version",current.at("/project/version").asLong(),"estimateId",current.at("/candidateEstimate/id").asText());
        JsonNode applied=call("POST",url+"/apply",apply,200);assertEquals(current.get("candidateEstimate"),applied.at("/project/estimateDetails"));assertEquals(current.at("/candidateEstimate/total/min").asInt(),applied.at("/project/budgetMinRub").asInt());
        assertEquals(original.at("/project/durationMinDays"),applied.at("/project/durationMinDays"));
        assertEquals(applied.at("/project/version"),call("POST",url+"/apply",apply,200).at("/project/version"));
    }
    @Test void savedRoomMeasurementsSurviveAreaChangeAndStaleVersionsConflict()throws Exception{
        String url=create();JsonNode initial=call("GET",url,null,200);ObjectNode data=json.createObjectNode();ArrayNode rooms=initial.at("/data/rooms").deepCopy();((ObjectNode)rooms.get(0)).put("areaM2",18);data.set("rooms",rooms);data.put("roomCountManual",false);
        JsonNode saved=save(url,initial,"rooms",data);ObjectNode apartment=saved.at("/data/apartment").deepCopy();apartment.put("areaM2",75);
        JsonNode area=save(url,saved,"apartment",apartment);assertEquals(4,area.at("/data/rooms").size());assertEquals(18,area.at("/data/rooms/0/areaM2").asInt());assertEquals(3,area.get("recommendedRoomCount").asInt());
        call("PUT",url+"/apartment",Map.of("version",initial.at("/project/version").asLong(),"data",apartment),409);
    }
    @Test void inadequateAreasSaveDraftButBlockCalculationAndExcessDoesNotSave()throws Exception{
        String url=create();JsonNode initial=call("GET",url,null,200);ArrayNode rooms=initial.at("/data/rooms").deepCopy();((ObjectNode)rooms.get(0)).put("areaM2",63);
        ObjectNode data=json.createObjectNode();data.set("rooms",rooms);data.put("roomCountManual",false);
        JsonNode saved=save(url,initial,"rooms",data);assertEquals("incomplete",saved.get("calculationStatus").asText());assertTrue(saved.get("candidateEstimate").isNull());
        ((ObjectNode)rooms.get(0)).put("areaM2",70);
        call("PUT",url+"/rooms",Map.of("version",saved.at("/project/version").asLong(),"data",data),400);
        assertEquals(63,call("GET",url,null,200).at("/data/rooms/0/areaM2").asInt());
    }
    @Test void kitchenRefusalsAndStableIdsPersistAndDeletionRequiresConfirmation()throws Exception{
        String url=create();JsonNode initial=call("GET",url,null,200);ObjectNode kitchens=initial.at("/data/kitchens").deepCopy();String kitchenId=kitchens.fieldNames().next();ObjectNode equipment=(ObjectNode)kitchens.get(kitchenId);equipment.put("cabinets","keep");equipment.put("stove","none");for(String field:List.of("oven","refrigerator","hood","dishwasher"))equipment.put(field,false);
        JsonNode saved=save(url,initial,"kitchen",kitchens);JsonNode current=ready(url);assertEquals(0,current.at("/candidateEstimate/kitchen/expected").asInt());
        ArrayNode remaining=json.createArrayNode();current.at("/data/rooms").forEach(r->{if(!r.get("id").asText().equals(kitchenId))remaining.add(r);});ObjectNode data=json.createObjectNode();data.set("rooms",remaining);data.put("roomCountManual",false);
        call("PUT",url+"/rooms",Map.of("version",current.at("/project/version").asLong(),"data",data),400);
        JsonNode removed=call("PUT",url+"/rooms",Map.of("version",current.at("/project/version").asLong(),"data",data,"confirmedRemovals",List.of(kitchenId)),200);
        assertEquals(0,removed.at("/data/kitchens").size());
    }

    @Autowired ru.prorab.refinement.service.RefinementService refinementService;
    @Autowired ru.prorab.refinement.service.AreaAllocator allocator;
    @Test void lateResultCannotReplaceNewRevisionAndOldEstimateCannotBeApplied()throws Exception{
        String url=create();JsonNode initial=call("GET",url,null,200);
        ObjectNode a=initial.at("/data/apartment").deepCopy();a.put("areaM2",75);save(url,initial,"apartment",a);
        JsonNode first=ready(url);var firstEstimate=json.treeToValue(first.get("candidateEstimate"),ru.prorab.refinement.dto.RefinedEstimate.class);
        var firstInput=json.treeToValue(first.get("data"),ru.prorab.refinement.model.RefinementData.class);
        UUID id=UUID.fromString(first.at("/project/projectId").asText());
        var oldJob=new ru.prorab.refinement.service.RefinementService.Calculation(id,firstEstimate.id(),firstEstimate.revision(),firstInput,allocator.allocate(id,firstInput.apartment().areaM2(),firstInput.rooms()));
        ObjectNode b=first.at("/data/apartment").deepCopy();b.put("areaM2",80);save(url,first,"apartment",b);JsonNode second=ready(url);
        refinementService.complete(oldJob,firstEstimate);
        assertEquals(second.get("candidateEstimate"),call("GET",url,null,200).get("candidateEstimate"));
        call("POST",url+"/apply",Map.of("version",second.at("/project/version").asLong(),"estimateId",firstEstimate.id()),400);
    }

    @Test void failedCalculationKeepsInputsAndActiveEstimateAndRetryRecovers()throws Exception{
        String url=create();JsonNode original=call("GET",url,null,200);
        org.mockito.Mockito.doThrow(new IllegalStateException("Simulated calculator outage")).when(calculator)
                .calculate(org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.anyLong(),org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.any());
        ObjectNode a=original.at("/data/apartment").deepCopy();a.put("ceilingHeight",3);
        try{
            save(url,original,"apartment",a);JsonNode failed=null;
            for(int i=0;i<100;i++){failed=call("GET",url,null,200);if(failed.get("calculationStatus").asText().equals("failed"))break;Thread.sleep(20);}
            assertEquals("failed",failed.get("calculationStatus").asText());
            assertEquals(3,failed.at("/data/apartment/ceilingHeight").asInt());
            assertEquals(original.at("/project/budgetMinRub"),failed.at("/project/budgetMinRub"));
            org.mockito.Mockito.reset(calculator);
            call("POST",url+"/calculate",Map.of("version",failed.at("/project/version").asLong()),200);
            ready(url);
        }finally{org.mockito.Mockito.reset(calculator);}
    }
}
