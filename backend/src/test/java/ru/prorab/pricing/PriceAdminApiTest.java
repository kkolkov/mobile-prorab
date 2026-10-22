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
 @Test void publicAdminDoesNotOpenProjectOrAccountEndpoints()throws Exception{
  assertEquals(10,list().get("rows").size());assertEquals(0,list().get("missing").size());
  mvc.perform(get("/porabadmin")).andExpect(status().isOk()).andExpect(forwardedUrl("/porabadmin/index.html"));
  mvc.perform(get("/api/projects")).andExpect(status().isUnauthorized());mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
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
  assertEquals(9,list().get("rows").size());assertEquals("floor",list().at("/missing/0/code").asText());assertThrows(IllegalStateException.class,()->catalog.snapshot());
  save(row,404);row.putNull("version");save(row,200);assertEquals(10,list().get("rows").size());assertNotNull(catalog.snapshot());
  save(row,409);
 }
}
