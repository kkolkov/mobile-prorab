package ru.prorab.project.dto;

import ru.prorab.project.model.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProjectResponse(
        UUID projectId, ProjectStatus status, int completedStep, String name, NameSource nameSource,
        BigDecimal areaM2, String address, CurrentState currentState, TargetState targetState,
        Integer kitchensCount, Integer bathroomsCount, Boolean redevelopment, FinishLevel finishLevel,
        EstimateStatus estimateStatus, Integer budgetMinRub, Integer budgetMaxRub,
        Integer durationMinDays, Integer durationMaxDays, Instant updatedAt, long version
) {}
