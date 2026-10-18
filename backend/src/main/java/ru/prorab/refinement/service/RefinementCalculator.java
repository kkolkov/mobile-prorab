package ru.prorab.refinement.service;
import ru.prorab.refinement.model.AreaAllocation;
import ru.prorab.refinement.dto.RefinedEstimate;
import ru.prorab.refinement.model.RefinementData;
import java.util.UUID;
public interface RefinementCalculator {
    RefinedEstimate calculate(UUID estimateId,long revision,RefinementData data,AreaAllocation allocation);
}
