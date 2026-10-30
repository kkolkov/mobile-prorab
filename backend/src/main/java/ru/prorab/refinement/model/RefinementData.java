package ru.prorab.refinement.model;

import ru.prorab.project.model.*;
import java.math.BigDecimal;
import java.util.*;

/** User input only. Inferred areas and calculator defaults must never be stored here. */
public record RefinementData(Apartment apartment, List<Room> rooms, boolean roomCountManual,
                             Map<UUID, Kitchen> kitchens, Exteriors exteriors, Set<String> completedSections, Set<String> updatedSections) {
    public RefinementData { updatedSections=updatedSections==null?Set.of():Set.copyOf(updatedSections); }
    public RefinementData(Apartment apartment,List<Room> rooms,boolean roomCountManual,Map<UUID,Kitchen> kitchens,Exteriors exteriors,Set<String> completedSections) {
        this(apartment,rooms,roomCountManual,kitchens,exteriors,completedSections,Set.of());
    }
    public record Apartment(CurrentState currentState, TargetState targetState, FinishLevel finishLevel,
                            BigDecimal areaM2, BigDecimal ceilingHeight, String floor, String walls,
                            String ceiling, String doors, String demolition, String wallPreparation,
                            String floorPreparation, String electrical, Boolean redevelopment) {
        public Apartment(CurrentState currentState, TargetState targetState, FinishLevel finishLevel, BigDecimal areaM2, BigDecimal ceilingHeight, String floor, String walls, String ceiling, String doors, String demolition, String wallPreparation, String floorPreparation, String electrical) {
            this(currentState,targetState,finishLevel,areaM2,ceilingHeight,floor,walls,ceiling,doors,demolition,wallPreparation,floorPreparation,electrical,null);
        }
    }
    public record Room(UUID id, String type, String name, BigDecimal areaM2,
                       String floor, String walls, String ceiling, boolean automatic) {}
    public record Kitchen(String cabinets, BigDecimal lengthM, String facade, String countertop,
                          String stove, Boolean oven, Boolean refrigerator, Boolean hood, Boolean dishwasher, Boolean parametersConfirmed) {
        public Kitchen(String cabinets,BigDecimal lengthM,String facade,String countertop,String stove,Boolean oven,Boolean refrigerator,Boolean hood,Boolean dishwasher){this(cabinets,lengthM,facade,countertop,stove,oven,refrigerator,hood,dishwasher,null);}
        public static Kitchen defaults() { return new Kitchen("unknown", null, "unknown", "unknown", null, null, null, null, null); }
    }
    public record Exterior(BigDecimal areaM2, String glazing, String insulation, String floor,
                           String walls, String ceiling, Boolean lighting, Boolean sockets) {
        public static Exterior defaults() { return new Exterior(null, "unknown", "unknown", "unknown", "unknown", "unknown", null, null); }
    }
    public record Exteriors(String presence, Exterior balcony, Exterior loggia) {}
}
