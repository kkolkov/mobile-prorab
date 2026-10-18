package ru.prorab.refinement.dto;
import ru.prorab.refinement.model.AreaAllocation;
import ru.prorab.project.dto.ProjectResponse;
import ru.prorab.refinement.model.RefinementData;
import ru.prorab.refinement.service.AreaAllocator;
import java.util.Set;
public record RefinementResponse(ProjectResponse project, RefinementData data, long revision,
        int recommendedRoomCount, AreaAllocation allocation,
        String calculationStatus, String calculationMessage, boolean activeEstimateOutdated,
        Set<String> supportedMaterials, RefinedEstimate activeEstimate, RefinedEstimate candidateEstimate) {}
