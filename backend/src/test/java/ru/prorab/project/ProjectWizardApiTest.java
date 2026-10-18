package ru.prorab.project;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:wizard-api;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa", "spring.datasource.password="
})
@AutoConfigureMockMvc
class ProjectWizardApiTest {
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

    @Test void ac18ReturnToFirstStepUpdatesSameDraftWithoutCompletingSecondStep() throws Exception {
        JsonNode original = json.readTree(mvc.perform(post("/api/projects/draft")
                .contentType("application/json").content("{\"areaM2\":33}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        String base = "/api/projects/" + original.get("projectId").asText();
        String body = json.writeValueAsString(java.util.Map.of("version",original.get("version").asLong(),
                "areaM2",38,"name","Ремонт МОЕЙ квартиры 38 м²","address","Тестовый адрес"));
        mvc.perform(put(base+"/steps/1").contentType("application/json").content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.projectId").value(original.get("projectId").asText()))
                .andExpect(jsonPath("$.completedStep").value(1)).andExpect(jsonPath("$.areaM2").value(38))
                .andExpect(jsonPath("$.address").value("Тестовый адрес"));
        mvc.perform(put(base+"/steps/1").contentType("application/json").content(body)).andExpect(status().isConflict());
        JsonNode latest=json.readTree(mvc.perform(get(base)).andReturn().getResponse().getContentAsString());
        mvc.perform(put(base+"/steps/1").contentType("application/json").content(json.writeValueAsString(
                java.util.Map.of("version",latest.get("version").asLong(),"areaM2",38.55))))
                .andExpect(status().isBadRequest());
    }

    @Test void ac05ToAc12LowercaseCodesAndReturnedVersionsAllowSequentialSteps() throws Exception {
        for (String current : new String[]{"no_finish", "white_box", "old_finish", "lived_in"}) {
            JsonNode project = json.readTree(mvc.perform(post("/api/projects/draft")
                    .contentType("application/json").content("{\"areaM2\":68}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("draft"))
                    .andExpect(jsonPath("$.nameSource").value("auto"))
                    .andReturn().getResponse().getContentAsString());
            String base = "/api/projects/" + project.get("projectId").asText();
            String[] data = {"\"currentState\":\"" + current + "\"",
                    "\"targetState\":\"move_in_ready\"",
                    "\"kitchensCount\":1,\"bathroomsCount\":1,\"redevelopment\":false",
                    "\"finishLevel\":\"comfort\""};
            for (int step = 2; step <= 5; step++) {
                long version = project.get("version").asLong();
                project = json.readTree(mvc.perform(put(base + "/steps/" + step + (step == 5 ? "/estimate" : ""))
                        .contentType("application/json")
                        .content("{\"version\":" + version + "," + data[step-2] + "}"))
                        .andExpect(status().isOk()).andExpect(jsonPath("$.completedStep").value(step))
                        .andReturn().getResponse().getContentAsString());
                assertTrue(project.get("version").asLong() > version);
                mvc.perform(get(base)).andExpect(jsonPath("$.version").value(project.get("version").asInt()));
            }
            assertEquals(current, project.get("currentState").asText());
            assertEquals("ready", project.get("estimateStatus").asText());
        }
    }
    @Test void amendedAc03AreaUpdatePreservesCustomTextAndUpdatesSuffix() throws Exception {
        for (String name : new String[]{"Ремонт МОЕЙ квартиры 33 м²", "Моя квартира"}) {
            JsonNode project = json.readTree(mvc.perform(post("/api/projects/draft")
                    .contentType("application/json").content(json.writeValueAsString(
                            java.util.Map.of("areaM2", 33, "name", name))))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
            String expected = name.endsWith("м²") ? "Ремонт МОЕЙ квартиры 38 м²" : name;
            mvc.perform(put("/api/projects/" + project.get("projectId").asText() + "/steps/2")
                    .contentType("application/json").content(json.writeValueAsString(java.util.Map.of(
                            "version", project.get("version").asLong(), "areaM2", 38, "currentState", "old_finish"))))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.name").value(expected))
                    .andExpect(jsonPath("$.nameSource").value("user"));
        }
    }
}
