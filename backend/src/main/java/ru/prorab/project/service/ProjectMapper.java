package ru.prorab.project.service;

import org.springframework.stereotype.Component;
import ru.prorab.project.dto.ProjectResponse;
import ru.prorab.project.entity.Project;

@Component
public class ProjectMapper {
    public ProjectResponse toResponse(Project p) {
        return new ProjectResponse(p.getProjectId(), p.getStatus(), p.getCompletedStep(), p.getName(), p.getNameSource(),
                p.getAreaM2(), p.getAddress(), p.getCurrentState(), p.getTargetState(), p.getKitchensCount(),
                p.getBathroomsCount(), p.getRedevelopment(), p.getFinishLevel(), p.getEstimateStatus(),
                p.getBudgetMinRub(), p.getBudgetMaxRub(), p.getDurationMinDays(), p.getDurationMaxDays(),
                p.getUpdatedAt(), p.getVersion());
    }
}
