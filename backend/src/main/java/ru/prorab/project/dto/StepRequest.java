package ru.prorab.project.dto;

import ru.prorab.project.model.*;

import java.math.BigDecimal;

public record StepRequest(
        Long version,
        BigDecimal areaM2,
        String address,
        String name,
        CurrentState currentState,
        TargetState targetState,
        Integer kitchensCount,
        Integer bathroomsCount,
        Boolean redevelopment,
        FinishLevel finishLevel,
        Integer roomsCount,
        Boolean otherRoomsRepair
) {
 public StepRequest(Long version, BigDecimal areaM2, String address, String name, CurrentState currentState, TargetState targetState, Integer kitchensCount, Integer bathroomsCount, Boolean redevelopment, FinishLevel finishLevel, Integer roomsCount) {
  this(version,areaM2,address,name,currentState,targetState,kitchensCount,bathroomsCount,redevelopment,finishLevel,roomsCount,null);
 }
}
