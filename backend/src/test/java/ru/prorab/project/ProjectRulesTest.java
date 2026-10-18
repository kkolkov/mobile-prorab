package ru.prorab.project;

import org.junit.jupiter.api.Test;
import ru.prorab.project.entity.Project;
import ru.prorab.project.model.*;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class ProjectRulesTest {
    @Test void draftHasRequiredDefaults() {
        Project p = Project.draft(new BigDecimal("68.0"), null, "Ремонт квартиры 68 м²");
        assertEquals(ProjectStatus.DRAFT, p.getStatus());
        assertEquals(1, p.getCompletedStep());
        assertEquals(NameSource.AUTO, p.getNameSource());
        assertEquals(1, p.getKitchensCount());
        assertEquals(1, p.getBathroomsCount());
        assertFalse(p.getRedevelopment());
        assertEquals(EstimateStatus.NOT_REQUESTED, p.getEstimateStatus());
    }

    @Test void enumsMatchContract() {
        assertArrayEquals(new ProjectStatus[]{ProjectStatus.DRAFT, ProjectStatus.ACTIVE, ProjectStatus.COMPLETED}, ProjectStatus.values());
        assertEquals(4, CurrentState.values().length);
        assertEquals(3, TargetState.values().length);
        assertEquals(3, FinishLevel.values().length);
        assertEquals(5, EstimateStatus.values().length);
    }
}
