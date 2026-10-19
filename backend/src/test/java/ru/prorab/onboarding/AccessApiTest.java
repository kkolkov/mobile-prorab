package ru.prorab.onboarding;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:access-api;MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password="})
@AutoConfigureMockMvc
class AccessApiTest {
    @org.springframework.test.context.bean.override.mockito.MockitoBean ru.prorab.config.AuthInterceptor authInterceptor;
    @org.junit.jupiter.api.BeforeEach void businessFixtureIdentity() throws Exception {
        org.mockito.Mockito.when(authInterceptor.preHandle(org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.any())).thenAnswer(call->{
            jakarta.servlet.http.HttpServletRequest request=call.getArgument(0);
            String id=request.getHeader("X-Prorab-User");
            if(id!=null)request.setAttribute("userId",java.util.UUID.fromString(id));
            return true;
        });
    }

 @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired JdbcTemplate db;
 final String base="/api/projects/access";
 @BeforeEach void reset(){db.update("delete from onboarding_events");db.update("delete from user_access");db.update("update access_allocation set next_number=0");}
 JsonNode call(MockHttpServletRequestBuilder request,UUID user,String body) throws Exception {
  if(body!=null)request.contentType("application/json").content(body);
  return json.readTree(mvc.perform(request.header("X-Prorab-User",user)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
 }
 JsonNode draft(UUID user) throws Exception {return call(post("/api/projects/draft"),user,"{\"areaM2\":33}");}
 String answers="{\"firstRenovation\":false,\"renovationManager\":\"self\",\"renovationStage\":\"completed\",\"questionnaireVersion\":\"1\"}";
 @Test void questionnairePersistsWithEachDraftWithoutStartingTrialOrChangingGroup() throws Exception {
  UUID user=UUID.randomUUID();
  JsonNode first=call(post("/api/projects/draft"),user,"{\"areaM2\":33,\"questionnaire\":"+answers+"}");
  UUID firstId=UUID.fromString(first.get("projectId").asText());
  assertEquals("completed",db.queryForObject("select questionnaire_stage from projects where project_id=?",String.class,firstId));
  assertEquals(false,db.queryForObject("select questionnaire_first_renovation from projects where project_id=?",Boolean.class,firstId));
  JsonNode access=call(get(base),user,null);assertFalse(access.get("questionnaireRequired").asBoolean());
  assertTrue(access.get("freemiumStartedAt").isNull());assertFalse(access.get("offerShown").asBoolean());
  JsonNode second=call(post("/api/projects/draft"),user,"{\"areaM2\":44,\"questionnaire\":"+answers.replace("completed","planning")+"}");
  assertEquals("planning",db.queryForObject("select questionnaire_stage from projects where project_id=?",String.class,UUID.fromString(second.get("projectId").asText())));
  assertEquals(access.get("userGroup"),call(get(base),user,null).get("userGroup"));
  UUID invalid=UUID.randomUUID();
  mvc.perform(post("/api/projects/draft").header("X-Prorab-User",invalid).contentType("application/json").content("{\"areaM2\":33,\"questionnaire\":{}}")).andExpect(status().isBadRequest());
  assertEquals(0,db.queryForObject("select count(*) from projects where owner_id=?",Integer.class,invalid));
  assertEquals(0,db.queryForObject("select count(*) from user_access where user_id=?",Integer.class,invalid));
 }
 @Test void assignmentAtSaveAlternatesByUserNotAnswersOrProjectCount() throws Exception {
  UUID a=UUID.randomUUID(),b=UUID.randomUUID(),c=UUID.randomUUID();
  mvc.perform(get(base).header("X-Prorab-User",a)).andExpect(status().isNotFound());
  draft(a);assertEquals("A",call(get(base),a,null).get("userGroup").asText());
  draft(a);draft(b);draft(c);
  assertEquals("B",call(get(base),b,null).get("userGroup").asText());
  assertEquals("A",call(get(base),c,null).get("userGroup").asText());
  assertTrue(call(get(base),a,null).get("freemiumStartedAt").isNull());
  call(post(base+"/answers"),a,answers);call(post(base+"/answers"),b,answers);
  assertEquals("A",call(get(base),a,null).get("userGroup").asText());
  assertEquals("B",call(get(base),b,null).get("userGroup").asText());
  assertEquals(3,db.queryForObject("select count(*) from onboarding_events where event_name='user_group_assigned'",Integer.class));
 }
 @Test void answersValidateAndAreImmutableAndRetriesDoNotDuplicateEvents() throws Exception {
  UUID a=UUID.randomUUID();draft(a);
  mvc.perform(post(base+"/answers").header("X-Prorab-User",a).contentType("application/json").content("{}" )).andExpect(status().isBadRequest());
  call(post(base+"/view"),a,"{}");call(post(base+"/view"),a,"{}");
  JsonNode original=call(post(base+"/answers"),a,answers),retry=call(post(base+"/answers"),a,answers);
  assertEquals(original.get("questionnaireCompletedAt"),retry.get("questionnaireCompletedAt"));
  assertFalse(retry.get("firstRenovation").asBoolean());assertFalse(retry.get("questionnaireRequired").asBoolean());
  mvc.perform(post(base+"/answers").header("X-Prorab-User",a).contentType("application/json").content(answers.replace("false","true"))).andExpect(status().isBadRequest());
  assertEquals(1,db.queryForObject("select count(*) from onboarding_events where event_name='onboarding_questionnaire_submitted'",Integer.class));
  assertEquals(1,db.queryForObject("select count(*) from onboarding_events where event_name='onboarding_questionnaire_viewed'",Integer.class));
 }
 @Test void trialStartsOnlyOnConfirmationLastsSevenDaysAndNeverRestarts() throws Exception {
  UUID a=UUID.randomUUID(),b=UUID.randomUUID();draft(a);draft(b);
  call(post(base+"/answers"),a,answers);call(post(base+"/offer"),a,"{}");
  assertFalse(call(get(base),a,null).get("fullAccess").asBoolean());
  JsonNode first=call(post(base+"/trial"),a,"{}"),retry=call(post(base+"/trial"),a,"{}");
  assertEquals(first.get("freemiumStartedAt"),retry.get("freemiumStartedAt"));
  assertTrue(retry.get("fullAccess").asBoolean());
  assertEquals(java.time.Duration.ofDays(7),java.time.Duration.between(java.time.Instant.parse(first.get("freemiumStartedAt").asText()),java.time.Instant.parse(first.get("freemiumEndsAt").asText())));
  db.update("update user_access set freemium_ends_at=? where user_id=?",java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(1)),a);
  assertFalse(call(post(base+"/trial"),a,"{}").get("fullAccess").asBoolean());
  mvc.perform(post(base+"/trial").header("X-Prorab-User",b)).andExpect(status().isBadRequest());
  assertEquals(1,db.queryForObject("select count(*) from onboarding_events where event_name='freemium_access_started'",Integer.class));
 }
 @Test void completedHistorySkipsQuestionnaireForcesBWithoutConsumingAlternation() throws Exception {
  UUID existing=UUID.randomUUID();JsonNode old=draft(UUID.randomUUID());
  db.update("update projects set owner_id=?,status='COMPLETED' where project_id=?",existing,UUID.fromString(old.get("projectId").asText()));
  db.update("update access_allocation set next_number=0");draft(existing);
  JsonNode access=call(get(base),existing,null);assertEquals("B",access.get("userGroup").asText());
  assertEquals("completed_project",access.get("assignmentSource").asText());assertFalse(access.get("questionnaireRequired").asBoolean());
  UUID next=UUID.randomUUID();draft(next);assertEquals("A",call(get(base),next,null).get("userGroup").asText());
 }
 @Test void concurrentFirstSavesAssignExactlyOncePerUser() throws Exception {
  UUID same=UUID.randomUUID();
  try(var pool=Executors.newFixedThreadPool(4)){
   var calls=new ArrayList<Callable<JsonNode>>();for(int i=0;i<4;i++)calls.add(()->draft(same));
   for(var result:pool.invokeAll(calls))result.get();
  }
  assertEquals(1L,db.queryForObject("select next_number from access_allocation where id=1",Long.class));
  assertEquals(1,db.queryForObject("select count(*) from user_access",Integer.class));
 }
 @Test void failedAssignmentRollsBackProjectAndRecordsTechnicalEvent() throws Exception {
  UUID user=UUID.randomUUID();int before=db.queryForObject("select count(*) from projects",Integer.class);
  db.update("delete from access_allocation");
  try {
   assertThrows(jakarta.servlet.ServletException.class,()->mvc.perform(post("/api/projects/draft").header("X-Prorab-User",user).contentType("application/json").content("{\"areaM2\":33}")));
   assertEquals(before,db.queryForObject("select count(*) from projects",Integer.class));
   assertEquals(0,db.queryForObject("select count(*) from user_access",Integer.class));
   assertEquals(1,db.queryForObject("select count(*) from onboarding_events where event_name='user_group_assignment_error'",Integer.class));
  } finally {db.update("insert into access_allocation values (1,0)");}
 }

}
