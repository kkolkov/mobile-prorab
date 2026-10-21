package ru.prorab.estimate.service;

import org.springframework.stereotype.Service;
import ru.prorab.estimate.dto.EstimateResult;
import ru.prorab.project.entity.Project;
import ru.prorab.pricing.service.UnitPriceCalculator;
import ru.prorab.refinement.service.AreaAllocator;
import ru.prorab.refinement.service.InitialRefinementData;
import java.util.UUID;

@Service
public class UnitPriceEstimateService implements EstimateService {
    private final UnitPriceCalculator calculator;
    private final InitialRefinementData inputs;
    private final AreaAllocator allocator;
    public UnitPriceEstimateService(UnitPriceCalculator calculator,InitialRefinementData inputs,AreaAllocator allocator){this.calculator=calculator;this.inputs=inputs;this.allocator=allocator;}
    public EstimateResult calculate(Project p){
        var d=inputs.from(p);
        var estimate=calculator.calculate(UUID.randomUUID(),-1,d,allocator.allocate(p.getProjectId(),p.getAreaM2(),d.rooms()));
        return new EstimateResult(estimate.total().min().intValueExact(),estimate.total().max().intValueExact(),estimate.durationMinDays(),estimate.durationMaxDays(),estimate);
    }
}
