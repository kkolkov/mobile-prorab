package ru.prorab.execution;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import java.util.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:execution-api;MODE=PostgreSQL;DB_CLOSE_DELAY=-1","spring.datasource.driver-class-name=org.h2.Driver","spring.datasource.username=sa","spring.datasource.password="})
@AutoConfigureMockMvc
class ExecutionApiTest {
 @Autowired MockMvc mvc;@Autowired ObjectMapper json;String token;
 JsonNode call(String path,Object body,int status)throws Exception{var req=body==null?get(path):post(path);if(token!=null)req.header("Authorization","Bearer "+token);if(body!=null)req.contentType("application/json").content(json.writeValueAsString(body));return json.readTree(mvc.perform(req).andExpect(status().is(status)).andReturn().getResponse().getContentAsString());}
 JsonNode put(String path,Object body)throws Exception{return json.readTree(mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(path).header("Authorization","Bearer "+token).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());}
 void register()throws Exception{token=call("/api/auth/register",Map.of("login","exec_"+UUID.randomUUID().toString().replace("-",""),"password","Execution-test-123","privacyAccepted",true),200).get("token").asText();}
 String create()throws Exception{register();var p=call("/api/projects/draft",Map.of("areaM2",60),200);String path="/api/projects/"+p.get("projectId").asText();
  p=put(path+"/steps/2",Map.of("version",p.get("version").asLong(),"currentState","old_finish"));
  p=put(path+"/steps/3",Map.of("version",p.get("version").asLong(),"targetState","move_in_ready"));
  p=put(path+"/steps/5/estimate",Map.of("version",p.get("version").asLong(),"finishLevel","budget"));
  call(path+"/activate?version="+p.get("version").asLong(),Map.of(),200);return path+"/execution";
 }
 JsonNode command(String path,String action,JsonNode s,Map<String,Object> data)throws Exception{var b=new HashMap<>(data);b.put("version",s.get("version").asLong());return call(path+"/"+action,b,200);}
 @Test void planUsesAppliedSnapshotAndCalendarHasInclusiveDatesAndCascades()throws Exception{
  String path=create();var s=call(path,null,200);assertEquals(54,s.at("/data/budget/timePlan/totalDays").asInt());
  assertEquals(s.at("/data/budget/total/expected"),s.get("planBudget"));
  String start=LocalDate.now().minusDays(100).toString();s=command(path,"start",s,Map.of("date",start));
  var first=s.at("/data/tasks/0");assertEquals(17,first.get("durationDays").asInt());
  assertEquals(16,ChronoUnit.DAYS.between(LocalDate.parse(first.get("startDate").asText()),LocalDate.parse(first.get("endDate").asText())));
  var original=s.deepCopy();s=command(path,"shift",s,Map.of("taskId","rough","days",3,"reason","Поставка"));
  assertEquals(LocalDate.parse(original.get("forecastEnd").asText()).plusDays(3).toString(),s.get("forecastEnd").asText());
  assertEquals(original.at("/data/tasks/1/baselineStart"),s.at("/data/tasks/1/baselineStart"));
  assertEquals(original.at("/data/tasks/1/durationDays"),s.at("/data/tasks/1/durationDays"));
  assertTrue(s.at("/data/history").toString().contains("Поставка"));
  s=command(path,"complete",s,Map.of("taskId","rough","date",s.at("/data/tasks/0/endDate").asText()));
  assertEquals("completed",s.at("/data/tasks/0/status").asText());assertEquals("in_progress",s.at("/data/tasks/1/status").asText());assertEquals(25,s.get("progressPercent").asInt());
  call(path+"/complete",Map.of("version",s.get("version").asLong(),"taskId","assembly","date",LocalDate.now().toString()),400);
  call(path+"/complete",Map.of("version",s.get("version").asLong(),"taskId","drying","date",s.at("/data/tasks/1/startDate").asText()),400);
  assertEquals(s.get("data"),call(path,null,200).get("data"));
 }
 @Test void expensesAreExactIdempotentEditableAndConflictsDoNotLoseMoney()throws Exception{
  String path=create();var before=call(path,null,200);UUID id=UUID.randomUUID();var payload=new HashMap<String,Object>();payload.put("expenseId",id);payload.put("title","Материалы");payload.put("amount",new java.math.BigDecimal("123.45"));payload.put("category","rough");payload.put("date",LocalDate.now().toString());
  var s=command(path,"expense",before,payload);assertEquals(123.45,s.get("spentTotal").asDouble());
  assertEquals(1,command(path,"expense",before,payload).at("/data/expenses").size());
  payload.put("expenseId",UUID.randomUUID());payload.put("version",before.get("version").asLong());call(path+"/expense",payload,409);
  payload.put("expenseId",id);payload.put("amount",new java.math.BigDecimal("99999999.99"));s=command(path,"edit-expense",s,payload);assertTrue(s.get("remainingBudget").asDouble()<0);
  assertEquals(before.get("planBudget"),s.get("planBudget"));
  s=command(path,"remove-expense",s,Map.of("expenseId",id));assertEquals(0,s.get("spentTotal").asInt());
  payload.put("expenseId",UUID.randomUUID());payload.put("amount",-10);payload.put("version",s.get("version").asLong());call(path+"/expense",payload,400);
 }
 @Test void anotherAccountCannotReadOrMutateExecution()throws Exception{
  String path=create();call(path,null,200);register();call(path,null,404);call(path+"/start",Map.of("version",0,"date",LocalDate.now().toString()),404);
 }
 @Test void newCandidateDoesNotChangePlanAndSyncPreservesExpensesAndStartedTasks()throws Exception{
  String path=create(),ref=path.replace("/execution","/refinement");var s=call(path,null,200);
  s=command(path,"start",s,Map.of("date",LocalDate.now().minusDays(1).toString()));
  s=command(path,"expense",s,Map.of("expenseId",UUID.randomUUID(),"title","Оплата","amount",100,"category","labor","date",LocalDate.now().toString(),"taskId","rough"));
  var old=s.deepCopy();var r=call(ref,null,200);var apartment=(com.fasterxml.jackson.databind.node.ObjectNode)r.at("/data/apartment").deepCopy();apartment.put("areaM2",70);
  r=put(ref+"/apartment",Map.of("version",r.at("/project/version").asLong(),"data",apartment));
  for(int i=0;i<100&&r.get("calculationStatus").asText().equals("pending");i++){Thread.sleep(30);r=call(ref,null,200);}
  assertEquals("ready",r.get("calculationStatus").asText());assertEquals(old.get("planBudget"),call(path,null,200).get("planBudget"));
  call(ref+"/apply",Map.of("version",r.at("/project/version").asLong(),"estimateId",r.at("/candidateEstimate/id").asText()),200);
  s=call(path,null,200);assertTrue(s.get("newerEstimate").asBoolean());assertEquals(old.get("planBudget"),s.get("planBudget"));
  s=command(path,"sync",s,Map.of("estimateId",r.at("/candidateEstimate/id").asText()));
  assertEquals(r.at("/candidateEstimate/total/expected"),s.get("planBudget"));assertEquals(old.at("/data/tasks"),s.at("/data/tasks"));assertEquals(old.at("/data/expenses"),s.at("/data/expenses"));assertFalse(s.get("newerEstimate").asBoolean());
 }
}
