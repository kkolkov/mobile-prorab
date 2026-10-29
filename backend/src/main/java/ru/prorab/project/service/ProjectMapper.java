package ru.prorab.project.service;

import org.springframework.stereotype.Component;
import ru.prorab.project.dto.ProjectResponse;
import ru.prorab.project.entity.Project;

@Component
public class ProjectMapper {
    private final ru.prorab.pricing.service.EstimateSnapshots snapshots;
    private final ru.prorab.execution.service.ExecutionService executions;
    public ProjectMapper(ru.prorab.pricing.service.EstimateSnapshots snapshots,ru.prorab.execution.service.ExecutionService executions){this.snapshots=snapshots;this.executions=executions;}
    public ProjectResponse toResponse(Project p) { return toResponse(p,executions.repairStatus(p.getProjectId())); }
    public ProjectResponse toResponse(Project p,String repairStatus) {
        return new ProjectResponse(p.getProjectId(), p.getStatus(), p.getCompletedStep(), p.getName(), p.getNameSource(),
                p.getAreaM2(), p.getAddress(), p.getCurrentState(), p.getTargetState(), p.getKitchensCount(),
                p.getBathroomsCount(), p.getRedevelopment(), p.getFinishLevel(), p.getEstimateStatus(),
                p.getBudgetMinRub(), p.getBudgetMaxRub(), p.getDurationMinDays(), p.getDurationMaxDays(),
                p.getUpdatedAt(), p.getVersion(), p.getRoomsCount(), snapshots.read(p.getEstimateDetailsJson()), p.isOtherRoomsRepair(),repairStatus);
    }
}
