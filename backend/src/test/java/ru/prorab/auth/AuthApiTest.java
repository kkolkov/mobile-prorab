package ru.prorab.auth;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:auth-api;MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password="})
@AutoConfigureMockMvc
class AuthApiTest {
 @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired JdbcTemplate db;
 String credentials(String login,String password) throws Exception{return json.writeValueAsString(Map.of("login",login,"password",password,"privacyAccepted",true));}
 JsonNode register() throws Exception {return register("u"+UUID.randomUUID().toString().replace("-",""));}
 JsonNode register(String login) throws Exception{return json.readTree(mvc.perform(post("/api/auth/register").contentType("application/json").content(credentials(login,"Test-pass-123"))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());}
 String bearer(JsonNode a){return "Bearer "+a.get("token").asText();}
 @Test void renameValidatesOwnerVersionAndPreservesProjectData() throws Exception {
  JsonNode owner=register(),other=register();
  JsonNode project=json.readTree(mvc.perform(post("/api/projects/draft").header("Authorization",bearer(owner)).contentType("application/json").content("{\"areaM2\":33}")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
  String id=project.get("projectId").asText(),path="/api/projects/"+id+"/name";
  long version=project.get("version").asLong();
  String body=json.writeValueAsString(Map.of("name","  Новый проект  ","version",version));
  mvc.perform(put(path).header("Authorization",bearer(other)).contentType("application/json").content(body)).andExpect(status().isNotFound());
  for(String invalid:List.of("", "   ","x".repeat(101)))mvc.perform(put(path).header("Authorization",bearer(owner)).contentType("application/json").content(json.writeValueAsString(Map.of("name",invalid,"version",version)))).andExpect(status().isBadRequest());
  mvc.perform(put(path).header("Authorization",bearer(owner)).contentType("application/json").content("{\"name\":\"Новое\"}")).andExpect(status().isBadRequest());
  JsonNode renamed=json.readTree(mvc.perform(put(path).header("Authorization",bearer(owner)).contentType("application/json").content(body)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
  assertEquals("Новый проект",renamed.get("name").asText());assertEquals("user",renamed.get("nameSource").asText());assertTrue(renamed.get("version").asLong()>version);
  for(String key:List.of("status","completedStep","estimateStatus","budgetMinRub","durationMinDays"))assertEquals(project.get(key),renamed.get(key));
  assertEquals(0,project.get("areaM2").decimalValue().compareTo(renamed.get("areaM2").decimalValue()));
  mvc.perform(put(path).header("Authorization",bearer(owner)).contentType("application/json").content(body)).andExpect(status().isConflict());
  db.update("update projects set status='ACTIVE', completed_step=5 where project_id=?",UUID.fromString(id));
  mvc.perform(put(path).header("Authorization",bearer(owner)).contentType("application/json").content(json.writeValueAsString(Map.of("name","Активный проект","version",renamed.get("version").asLong())))).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("active")).andExpect(jsonPath("$.completedStep").value(5));
  assertEquals("Активный проект",db.queryForObject("select name from projects where project_id=?",String.class,UUID.fromString(id)));
 }
 @Test void registrationRequiresExplicitPrivacyConsent() throws Exception {
  String login="consent"+UUID.randomUUID().toString().replace("-","");
  for(String extra:List.of("",",\"privacyAccepted\":false",",\"privacyAccepted\":null")){
   mvc.perform(post("/api/auth/register").contentType("application/json").content("{\"login\":\""+login+"\",\"password\":\"Test-pass-123\""+extra+"}")).andExpect(status().isBadRequest());
   assertEquals(0,db.queryForObject("select count(*) from accounts where login=?",Integer.class,login));
  }
  register(login);
  mvc.perform(post("/api/auth/login").contentType("application/json").content(json.writeValueAsString(Map.of("login",login,"password","Test-pass-123")))).andExpect(status().isOk());
 }
 @Test void registrationHashesPasswordAndLoginWorksAcrossSessions() throws Exception {
  JsonNode a=register();UUID user=UUID.fromString(a.get("userId").asText());
  String stored=db.queryForObject("select password_hash from accounts where user_id=?",String.class,user);
  assertNotEquals("Test-pass-123",stored);assertTrue(stored.startsWith("600000:"));
  assertFalse(a.has("passwordHash"));assertFalse(a.has("password"));
  JsonNode second=json.readTree(mvc.perform(post("/api/auth/login").contentType("application/json").content(credentials(a.get("login").asText().toUpperCase(),"Test-pass-123"))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
  assertEquals(a.get("userId"),second.get("userId"));assertNotEquals(a.get("token"),second.get("token"));
  mvc.perform(get("/api/auth/me").header("Authorization",bearer(second))).andExpect(status().isOk()).andExpect(jsonPath("$.login").value(a.get("login").asText()));
  assertEquals(2,db.queryForObject("select count(*) from auth_sessions where user_id=?",Integer.class,user));
  assertEquals(0,db.queryForObject("select count(*) from auth_sessions where token_hash=?",Integer.class,a.get("token").asText()));
 }
 @Test void duplicateLoginAndInvalidCredentialsAreRejected() throws Exception {
  JsonNode a=register();String login=a.get("login").asText();
  mvc.perform(post("/api/auth/register").contentType("application/json").content(credentials(login.toUpperCase(),"Test-pass-123"))).andExpect(status().isConflict());
  mvc.perform(post("/api/auth/login").contentType("application/json").content(credentials(login,"wrong-pass"))).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Неверный логин или пароль"));
  mvc.perform(post("/api/auth/login").contentType("application/json").content(credentials("unknown-user","wrong-pass"))).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Неверный логин или пароль"));
  mvc.perform(post("/api/auth/register").contentType("application/json").content(credentials("ab","short"))).andExpect(status().isBadRequest());
 }
 @Test void logoutRevokesOnlyCurrentSessionAndExpiryIsEnforced() throws Exception {
  JsonNode a=register();String login=a.get("login").asText();
  JsonNode b=json.readTree(mvc.perform(post("/api/auth/login").contentType("application/json").content(credentials(login,"Test-pass-123"))).andReturn().getResponse().getContentAsString());
  mvc.perform(post("/api/auth/logout").header("Authorization",bearer(a))).andExpect(status().isOk());
  mvc.perform(get("/api/auth/me").header("Authorization",bearer(a))).andExpect(status().isUnauthorized());
  mvc.perform(get("/api/auth/me").header("Authorization",bearer(b))).andExpect(status().isOk());
  db.update("update auth_sessions set expires_at=? where user_id=?",java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(1)),UUID.fromString(a.get("userId").asText()));
  mvc.perform(get("/api/auth/me").header("Authorization",bearer(b))).andExpect(status().isUnauthorized());
 }
 @Test void projectOwnershipCannotBeForgedAndAccessFollowsAccount() throws Exception {
  JsonNode a=register(),b=register();String token=bearer(a);
  mvc.perform(post("/api/projects/draft").header("X-Prorab-User",a.get("userId").asText()).contentType("application/json").content("{\"areaM2\":33}")).andExpect(status().isUnauthorized());
  JsonNode p=json.readTree(mvc.perform(post("/api/projects/draft").header("Authorization",token).header("X-Prorab-User",b.get("userId").asText()).contentType("application/json").content("{\"areaM2\":33}")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
  String path="/api/projects/"+p.get("projectId").asText();
  mvc.perform(get(path).header("Authorization",bearer(b))).andExpect(status().isNotFound());
  mvc.perform(get(path+"/refinement").header("Authorization",bearer(b))).andExpect(status().isNotFound());
  mvc.perform(put(path+"/steps/1").header("Authorization",bearer(b)).contentType("application/json").content("{}" )).andExpect(status().isNotFound());
  mvc.perform(get("/api/projects").header("Authorization",token)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
  mvc.perform(get("/api/projects").header("Authorization",bearer(b))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
  mvc.perform(get("/api/projects/access").header("Authorization",token)).andExpect(status().isOk());
  mvc.perform(get("/api/projects/access").header("Authorization",bearer(b)).header("X-Prorab-User",a.get("userId").asText())).andExpect(status().isNotFound());
 }

 @Test void passwordChangeNeedsSessionAndRejectsInvalidPassword()throws Exception{
  mvc.perform(put("/api/auth/password").contentType("application/json").content("{\"newPassword\":\"Changed-pass-123\"}")).andExpect(status().isUnauthorized());
  var a=register();
  for(String password:List.of("","short","        ","a".repeat(129)))mvc.perform(put("/api/auth/password").header("Authorization",bearer(a)).contentType("application/json").content(json.writeValueAsString(Map.of("newPassword",password)))).andExpect(status().isBadRequest());
  mvc.perform(put("/api/auth/password").header("Authorization",bearer(a)).contentType("application/json").content("{}")).andExpect(status().isBadRequest());
  mvc.perform(post("/api/auth/login").contentType("application/json").content(credentials(a.get("login").asText(),"Test-pass-123"))).andExpect(status().isOk());
 }
 @Test void passwordChangeUsesCurrentAccountAndRevokesOtherSessionsOnly()throws Exception{
  var a=register();var other=register();
  var second=json.readTree(mvc.perform(post("/api/auth/login").contentType("application/json").content(credentials(a.get("login").asText(),"Test-pass-123"))).andReturn().getResponse().getContentAsString());
  String password="Changed-pass-456";
  mvc.perform(put("/api/auth/password").header("Authorization",bearer(a)).contentType("application/json").content(json.writeValueAsString(Map.of("newPassword",password,"userId",other.get("userId").asText())))).andExpect(status().isOk()).andExpect(jsonPath("$.ok").value(true));
  mvc.perform(get("/api/auth/me").header("Authorization",bearer(a))).andExpect(status().isOk());
  mvc.perform(get("/api/auth/me").header("Authorization",bearer(second))).andExpect(status().isUnauthorized());
  mvc.perform(put("/api/auth/password").header("Authorization",bearer(second)).contentType("application/json").content(json.writeValueAsString(Map.of("newPassword","Another-pass-789")))).andExpect(status().isUnauthorized());
  mvc.perform(post("/api/auth/login").contentType("application/json").content(credentials(a.get("login").asText(),"Test-pass-123"))).andExpect(status().isUnauthorized());
  mvc.perform(post("/api/auth/login").contentType("application/json").content(credentials(a.get("login").asText(),password))).andExpect(status().isOk());
  mvc.perform(post("/api/auth/login").contentType("application/json").content(credentials(other.get("login").asText(),"Test-pass-123"))).andExpect(status().isOk());
  String hash=db.queryForObject("select password_hash from accounts where user_id=?",String.class,UUID.fromString(a.get("userId").asText()));assertNotEquals(password,hash);assertTrue(hash.startsWith("600000:"));
 }
}
