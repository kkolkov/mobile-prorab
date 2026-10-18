package ru.prorab.project;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import ru.prorab.project.entity.Project;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:project-mapping;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ProjectPersistenceTest {
    @Autowired private TestEntityManager entityManager;

    @Test
    void ac05DraftAreaRoundTripsThroughFlywaySchema() {
        Project draft = Project.draft(new BigDecimal("68.5"), null, "Ремонт квартиры 68.5 м²");
        entityManager.persistAndFlush(draft);
        entityManager.clear();

        Project loaded = entityManager.find(Project.class, draft.getProjectId());
        assertEquals(new BigDecimal("68.5"), loaded.getAreaM2());
        assertEquals(1, loaded.getCompletedStep());
    }
}
