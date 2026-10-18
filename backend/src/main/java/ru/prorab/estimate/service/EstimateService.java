package ru.prorab.estimate.service;
import ru.prorab.estimate.dto.EstimateResult;
import ru.prorab.project.entity.Project;
public interface EstimateService { EstimateResult calculate(Project project); }
