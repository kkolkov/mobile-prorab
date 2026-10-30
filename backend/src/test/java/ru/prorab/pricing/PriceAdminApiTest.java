package ru.prorab.pricing;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import ru.prorab.pricing.service.PriceCatalog;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:price-admin;MODE=PostgreSQL;DB_CLOSE_DELAY=-1","spring.datasource.driver-class-name=org.h2.Driver","spring.datasource.username=sa","spring.datasource.password="})
@AutoConfigureMockMvc @Transactional
class PriceAdminApiTest {
 @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired PriceCatalog catalog;
 final String path="/api/porabadmin/prices";
 JsonNode list()throws Exception{return json.readTree(mvc.perform(get(path)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));}
 ObjectNode floor()throws Exception{for(var row:list().get("rows"))if(row.get("code").asText().equals("floor"))return (ObjectNode)row;throw new AssertionError();}
 JsonNode save(ObjectNode body,int status)throws Exception{return json.readTree(mvc.perform(put(path+"/floor").contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().is(status)).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));}

 @Test void verificationNamingAndCategoriesAreValidatedAndPersisted()throws Exception{
  var row=floor();row.put("verified",false);save(row,400);
  row.put("verified",true);row.put("category","work");row.put("subcategory","plumbing");save(row,400);
  row.putNull("subcategory");save(row,400);
  row.put("subcategory","finish");row.put("name","укладка ламината");var saved=save(row,200);
  assertEquals("Работа Укладка ламината",saved.get("title").asText());assertEquals("approved",saved.get("status").asText());
  assertEquals("Укладка ламината",floor().get("name").asText());assertEquals("finish",floor().get("subcategory").asText());
  var fresh=floor();fresh.put("name"," ");save(fresh,400);
 }
 @Test void coefficientsArePersistedBoundedAndProtectedFromStaleWrites()throws Exception{
  String root="/api/porabadmin/coefficients";
  var all=json.readTree(mvc.perform(get(root)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());assertEquals(12,all.size());
  ObjectNode body=null;for(var r:all)if(r.get("code").asText().equals("reserve"))body=(ObjectNode)r;
  assertNotNull(body);assertEquals(1.1,body.get("value").asDouble());
  for(double invalid:new double[]{-1,0,0.9,11,1.12345}){
   body.put("value",invalid);mvc.perform(put(root+"/reserve").contentType("application/json").content(body.toString())).andExpect(status().isBadRequest());
  }
  body.put("value",1.25);mvc.perform(put(root+"/reserve").contentType("application/json").content(body.toString())).andExpect(status().isOk()).andExpect(jsonPath("$.value").value(1.25));
  mvc.perform(put(root+"/reserve").contentType("application/json").content(body.toString())).andExpect(status().isConflict());
  var fresh=json.readTree(mvc.perform(get(root)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
  for(var r:fresh)if(r.get("code").asText().equals("reserve"))assertEquals(1.25,r.get("value").asDouble());
  mvc.perform(put(root+"/unknown").contentType("application/json").content(body.toString())).andExpect(status().isNotFound());
  mvc.perform(get("/porabadmin/coefficients.html")).andExpect(status().isOk());
 }
 @Test void importedAverageCanBeEditedDeletedAndRestoredWithConflictProtection()throws Exception{
  String code="average.work.laminate";
  ObjectNode body=null;for(var r:list().get("rows"))if(r.get("code").asText().equals(code))body=(ObjectNode)r;
  assertNotNull(body);assertEquals(1090.00,body.get("unitPriceRub").asDouble());
  body.put("verified",true);body.put("status","approved");body.put("unitPriceRub",400);body.put("sourceNote","Проверка длинного описания состава: "+"источник ".repeat(100));
  var saved=json.readTree(mvc.perform(put(path+"/"+code).contentType("application/json").content(body.toString())).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
  mvc.perform(put(path+"/"+code).contentType("application/json").content(body.toString())).andExpect(status().isConflict());
  mvc.perform(post(path+"/"+code+"/delete?version="+saved.get("version").asLong())).andExpect(status().isOk());
  assertThrows(IllegalStateException.class,()->catalog.snapshot().rate(code));
  for(var r:list().get("rows"))if(r.get("code").asText().equals(code))body.put("version",r.get("version").asLong());
  mvc.perform(put(path+"/"+code).contentType("application/json").content(body.toString())).andExpect(status().isOk());
  assertEquals(400,catalog.snapshot().rate(code).price().intValueExact());
 }
 @Test void timeNormsAreSeparateValidatedAndVersioned()throws Exception{
  String root="/api/porabadmin/time-norms";
  var all=json.readTree(mvc.perform(get(root)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());assertEquals(16,all.size());
  ObjectNode body=null;for(var r:all)if(r.get("code").asText().equals("laminate"))body=(ObjectNode)r;
  assertNotNull(body);assertEquals(22.55,body.get("personHoursPer100m2").asDouble());
  body.put("personHoursPer100m2",0);mvc.perform(put(root+"/laminate").contentType("application/json").content(body.toString())).andExpect(status().isBadRequest());
  body.put("personHoursPer100m2",30);mvc.perform(put(root+"/laminate").contentType("application/json").content(body.toString())).andExpect(status().isOk());
  mvc.perform(put(root+"/laminate").contentType("application/json").content(body.toString())).andExpect(status().isConflict());
  mvc.perform(get("/api/projects")).andExpect(status().isUnauthorized());
 }
 @Test void publicAdminDoesNotOpenProjectOrAccountEndpoints()throws Exception{
  assertEquals(500,list().get("rows").size());assertEquals(0,list().get("missing").size());
  mvc.perform(get("/porabadmin")).andExpect(status().isOk()).andExpect(forwardedUrl("/porabadmin/index.html"));
  mvc.perform(get("/api/projects")).andExpect(status().isUnauthorized());mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
 }
 @Test void adminAliasesAndPackagedAssetsAreAvailable()throws Exception{
  for(String route:new String[]{"/porabadmin","/porabadmin/","/prorabadmin","/prorabadmin/"})
   mvc.perform(get(route)).andExpect(status().isOk()).andExpect(forwardedUrl("/porabadmin/index.html"));
  for(String asset:new String[]{"/porabadmin/index.html","/porabadmin/app.js","/porabadmin/style.css","/porabadmin/guide.html","/prorabadmin/index.html"})
   mvc.perform(get(asset)).andExpect(status().isOk());
 }
 @Test void changedPricePersistsChangesCatalogHashAndOldSnapshotIsImmutable()throws Exception{
  var before=catalog.snapshot();var input=floor();input.put("unitPriceRub",3210.55);input.put("sourceNote","Прайс поставщика, Москва, работа + материал");input.put("priceDate",LocalDate.now().toString());input.put("verified",true);
  var saved=save(input,200);assertEquals(3210.55,floor().get("unitPriceRub").asDouble());assertTrue(saved.get("verified").asBoolean());
  assertNotEquals(before.version(),catalog.snapshot().version());assertEquals(2200,before.rate("floor").price().intValue());assertEquals(3210.55,catalog.snapshot().rate("floor").price().doubleValue());
  save(input,409);assertEquals(saved.get("version"),floor().get("version"));
 }
 @Test void rejectsInvalidMoneySharesDatesAndBlankSource()throws Exception{
  for(double money:new double[]{0,-1,1.111,100000000}){var body=floor();body.put("unitPriceRub",money);save(body,400);}
  var body=floor();body.put("roughShare",0.8);body.put("laborShare",0.3);save(body,400);
  body=floor();body.put("priceDate",LocalDate.now().plusDays(1).toString());save(body,400);
  body=floor();body.put("sourceNote"," ");save(body,400);
  assertEquals(2200,floor().get("unitPriceRub").asInt());
 }
 @Test void deleteRequiresCurrentVersionAndRestoreDoesNotInsertFakePrice()throws Exception{
  var row=floor();mvc.perform(post(path+"/floor/delete?version=999")).andExpect(status().isConflict());
  mvc.perform(post(path+"/floor/delete?version="+row.get("version").asLong())).andExpect(status().isOk());
  assertEquals(500,list().get("rows").size());assertEquals(0,list().get("missing").size());assertEquals("deleted",floor().get("status").asText());assertThrows(IllegalStateException.class,()->catalog.snapshot().rate("floor"));
  row.put("verified",true);save(row,409);row=floor();row.put("verified",true);row.put("status","approved");save(row,200);assertEquals(500,list().get("rows").size());assertNotNull(catalog.snapshot().rate("floor"));
  save(row,409);
 }
}
