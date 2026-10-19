package ru.prorab.estimate.service;

import org.springframework.stereotype.Service;
import ru.prorab.estimate.dto.EstimateResult;
import ru.prorab.project.entity.Project;
import ru.prorab.project.model.FinishLevel;

@Service
public class MockEstimateService implements EstimateService {
    @Override public EstimateResult calculate(Project p) {
        // Formula is intentionally a placeholder: the specification explicitly excludes the real pricing formula.
        int base = p.getAreaM2().multiply(java.math.BigDecimal.valueOf(25000)).intValue();
        double factor = switch (p.getFinishLevel()) {
            case BUDGET -> 0.85; case COMFORT -> 1.0; case BUSINESS -> 1.35;
        };
        int budget = (int)Math.round(base * factor);
        int rooms = (p.getRoomsCount()==null?p.getKitchensCount():p.getRoomsCount()) + p.getBathroomsCount();
        return new EstimateResult((int)(budget * .9), (int)(budget * 1.15), 90 + rooms * 10, 120 + rooms * 15);
    }
}
