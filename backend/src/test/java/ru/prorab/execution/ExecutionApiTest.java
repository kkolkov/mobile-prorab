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
 String photo()throws Exception{
  var image=new java.awt.image.BufferedImage(20,10,java.awt.image.BufferedImage.TYPE_INT_RGB);
  var out=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"png",out);
  return "data:image/png;base64,"+Base64.getEncoder().encodeToString(out.toByteArray());
 }
 @Test void completionPhotosPersistPrivatelyAndDeleteWithProject()throws Exception{
  String path=create();var s=command(path,"start",call(path,null,200),Map.of("date","2026-01-01"));
  var before=s.deepCopy();var payload=Map.<String,Object>of("taskId","rough","date","2026-01-17","reason","Готово","photos",List.of(Map.of("dataUrl",photo())));
  s=command(path,"complete",s,payload);assertEquals("completed",s.at("/data/tasks/0/status").asText());
  String photoId=s.at("/data/history/1/photoIds/0").asText();assertFalse(photoId.isBlank());assertEquals("rough",s.at("/data/history/1/taskId").asText());
  assertEquals(s.at("/data/tasks"),call(path,null,200).at("/data/tasks"));
  assertFalse(s.toString().contains("base64"));
  String imagePath=path+"/photos/"+photoId;
  assertTrue(call(imagePath,null,200).get("dataUrl").asText().startsWith("data:image/jpeg;base64,"));
  var stale=new HashMap<>(payload);stale.put("version",before.get("version").asLong());call(path+"/complete",stale,409);
  UUID projectId=UUID.fromString(path.split("/")[3]);assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM stage_photos WHERE project_id=?",Integer.class,projectId));
  String owner=token;token=null;call(imagePath,null,401);register();call(imagePath,null,404);
  String other=create();call(other+"/photos/"+photoId,null,404);token=owner;
  String project=path.replace("/execution","");var p=call(project,null,200);call(project+"/delete?version="+p.get("version").asLong(),Map.of(),200);
  assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM stage_photos WHERE project_id=?",Integer.class,projectId));
 }
 @Test void invalidPhotosRollBackCompletionAndUploadedImages()throws Exception{
  String path=create();var s=command(path,"start",call(path,null,200),Map.of("date","2026-01-01"));
  var payload=new HashMap<String,Object>();payload.put("version",s.get("version").asLong());payload.put("taskId","rough");payload.put("date","2026-01-17");
  var good=Map.of("dataUrl",photo());
  payload.put("photos",Collections.nCopies(6,good));call(path+"/complete",payload,400);
  payload.put("photos",List.of(good,Map.of("dataUrl","data:image/jpeg;base64,ZmFrZQ==")));call(path+"/complete",payload,400);
  payload.put("photos",List.of(Map.of("dataUrl","data:image/svg+xml;base64,PHN2Zz4=")));call(path+"/complete",payload,400);
  payload.put("photos",List.of(good));payload.put("days",1);call(path+"/shift",payload,400);
  assertEquals(s.get("data"),call(path,null,200).get("data"));
  assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM stage_photos WHERE project_id=?",Integer.class,UUID.fromString(path.split("/")[3])));
 }
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

 @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
 @Test void additionalWorkRescheduleEarlierPreservesDurationsBaselineExpensesAndCompletedStages()throws Exception{
  String path=create();var s=call(path,null,200);
  s=command(path,"start",s,Map.of("date","2026-01-30"));
  s=command(path,"expense",s,Map.of("expenseId",UUID.randomUUID(),"title","Материалы","amount",123,"category","rough","date","2026-01-01"));
  var before=s.deepCopy();s=command(path,"reschedule",s,Map.of("taskId","rough","date","2026-01-01"));
  assertEquals("2026-01-01",s.at("/data/startDate").asText());assertEquals(54,s.get("totalDays").asInt());
  assertEquals(before.at("/data/expenses"),s.at("/data/expenses"));assertEquals(before.get("planBudget"),s.get("planBudget"));
  assertEquals("2026-01-30",s.at("/data/tasks/0/baselineStart").asText());
  assertEquals(29,ChronoUnit.DAYS.between(LocalDate.parse(s.get("forecastEnd").asText()),LocalDate.parse(before.get("forecastEnd").asText())));
  call(path+"/reschedule",Map.of("version",before.get("version").asLong(),"taskId","rough","date","2025-12-01"),409);
  s=command(path,"complete",s,Map.of("taskId","rough","date","2026-01-17"));
  call(path+"/reschedule",Map.of("version",s.get("version").asLong(),"taskId","rough","date","2026-01-02"),400);
  call(path+"/reschedule",Map.of("version",s.get("version").asLong(),"taskId","drying","date","2026-01-17"),400);
  var completed=s.at("/data/tasks/0").deepCopy();s=command(path,"reschedule",s,Map.of("taskId","drying","date","2026-01-20"));
  s=command(path,"reschedule",s,Map.of("taskId","drying","date","2026-01-18"));
  assertEquals(completed,s.at("/data/tasks/0"));assertEquals(8,s.at("/data/tasks/1/durationDays").asInt());
 }
 @Test void additionalWorkAreaBoundsAndZeroCountsPersistAndCalculateKitchenAndRemainder()throws Exception{
  register();for(double area:new double[]{4.9,10000,5.01})call("/api/projects/draft",Map.of("areaM2",area),400);
  for(int area:new int[]{5,9999})call("/api/projects/draft",Map.of("areaM2",area),200);
  var p=call("/api/projects/draft",Map.of("areaM2",30),200);String path="/api/projects/"+p.get("projectId").asText();
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(path+"/steps/4").header("Authorization","Bearer "+token).contentType("application/json").content(json.writeValueAsString(Map.of("version",p.get("version").asLong(),"roomsCount",0,"bathroomsCount",0)))).andExpect(status().isBadRequest());
  p=put(path+"/steps/4",Map.of("version",p.get("version").asLong(),"roomsCount",0,"bathroomsCount",0,"otherRoomsRepair",true,"redevelopment",true));
  assertTrue(p.get("otherRoomsRepair").asBoolean());assertEquals(0,p.get("roomsCount").asInt());assertEquals(1,p.get("kitchensCount").asInt());
  p=put(path+"/steps/2",Map.of("version",p.get("version").asLong(),"currentState","white_box"));
  p=put(path+"/steps/3",Map.of("version",p.get("version").asLong(),"targetState","finish_only"));
  p=put(path+"/steps/5/estimate",Map.of("version",p.get("version").asLong(),"finishLevel","budget"));
  assertEquals("ready",p.get("estimateStatus").asText());assertTrue(p.get("budgetMinRub").asInt()>0);
  var r=call(path+"/refinement",null,200);assertEquals(1,r.at("/data/rooms").size());assertEquals("kitchen",r.at("/data/rooms/0/type").asText());assertTrue(r.at("/data/apartment/redevelopment").asBoolean());
  double sum=0;for(var a:r.at("/allocation/areas"))sum+=a.get("areaM2").asDouble();assertEquals(30,sum,0.001);
 }
 @Test void additionalWorkDeleteChecksOwnershipVersionAndRemovesAllProjectAggregates()throws Exception{
  String execution=create(),path=execution.replace("/execution","");var p=call(path,null,200);String owner=token;
  var s=call(execution,null,200);command(execution,"expense",s,Map.of("expenseId",UUID.randomUUID(),"title","Расход","amount",500,"category","labor","date",LocalDate.now().toString()));
  call(path+"/refinement",null,200);
  register();call(path+"/delete?version="+p.get("version").asLong(),Map.of(),404);token=owner;
  call(path+"/delete?version="+(p.get("version").asLong()+1),Map.of(),409);
  call(path+"/delete?version="+p.get("version").asLong(),Map.of(),200);
  call(path,null,404);call(execution,null,404);
  UUID id=UUID.fromString(p.get("projectId").asText());
  for(String table:List.of("projects","project_refinements","project_executions"))assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE project_id=?",Integer.class,id));
 }
 @Test void additionalWorkSavedChangesHavePersistentStatusAndBlankRoomNamesAreGenerated()throws Exception{
  String path=create().replace("/execution","/refinement");var r=call(path,null,200);
  r=put(path+"/apartment",Map.of("version",r.at("/project/version").asLong(),"data",r.at("/data/apartment")));
  assertTrue(r.at("/data/completedSections").toString().contains("apartment"));assertEquals(0,r.at("/data/updatedSections").size());
  var a=(com.fasterxml.jackson.databind.node.ObjectNode)r.at("/data/apartment").deepCopy();a.put("redevelopment",true);
  r=put(path+"/apartment",Map.of("version",r.at("/project/version").asLong(),"data",a));assertTrue(r.at("/project/redevelopment").asBoolean());
  assertTrue(call(path,null,200).at("/data/updatedSections").toString().contains("apartment"));
  var rooms=(com.fasterxml.jackson.databind.node.ArrayNode)r.at("/data/rooms").deepCopy();
  var room=rooms.addObject();room.put("id",UUID.randomUUID().toString());room.put("type","kitchen");room.put("name","");room.putNull("areaM2");room.put("floor","inherit");room.put("walls","inherit");room.put("ceiling","inherit");room.put("automatic",false);
  r=put(path+"/rooms",Map.of("version",r.at("/project/version").asLong(),"data",Map.of("rooms",rooms,"roomCountManual",true)));
  assertEquals("Кухня 2",r.at("/data/rooms/"+(rooms.size()-1)+"/name").asText());
  var before=r.at("/project/version");r=put(path+"/rooms",Map.of("version",before.asLong(),"data",Map.of("rooms",r.at("/data/rooms"),"roomCountManual",true)));
  assertEquals(before,r.at("/project/version"));assertFalse(r.at("/data/updatedSections").toString().contains("rooms"));
 }
}
