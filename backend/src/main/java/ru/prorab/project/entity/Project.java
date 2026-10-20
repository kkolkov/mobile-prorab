package ru.prorab.project.entity;

import jakarta.persistence.*;
import ru.prorab.project.model.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "projects")
public class Project {
    @Id @Column(name = "project_id", nullable = false, updatable = false)
    private UUID projectId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ProjectStatus status;
    @Column(nullable = false) private int completedStep;
    @Column(nullable = false, length = 100) private String name;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private NameSource nameSource;
    @Column(name = "area_m2", nullable = false, precision = 10, scale = 1) private BigDecimal areaM2;
    @Column(length = 250) private String address;
    @Enumerated(EnumType.STRING) private CurrentState currentState;
    @Enumerated(EnumType.STRING) private TargetState targetState;
    private Integer roomsCount;
    public Integer getRoomsCount(){return roomsCount;}
    public void setRoomsCount(Integer value){roomsCount=value;}
    private Integer kitchensCount;
    private Integer bathroomsCount;
    private Boolean redevelopment;
    @Enumerated(EnumType.STRING) private FinishLevel finishLevel;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private EstimateStatus estimateStatus;
    @Column(columnDefinition="text") private String estimateDetailsJson;
    public String getEstimateDetailsJson(){return estimateDetailsJson;}
    public void setEstimateDetailsJson(String value){estimateDetailsJson=value;}
    private Integer budgetMinRub;
    private Integer budgetMaxRub;
    private Integer durationMinDays;
    private Integer durationMaxDays;
    @Column(nullable = false) private Instant updatedAt;
    @Version @Column(nullable = false) private long version;

    private Boolean questionnaireFirstRenovation;
    private String questionnaireManager;
    private String questionnaireStage;
    private String questionnaireVersion;
    public void setQuestionnaire(ru.prorab.onboarding.dto.AnswersRequest answers) {
        if(answers==null)return;
        questionnaireFirstRenovation=answers.firstRenovation();
        questionnaireManager=answers.renovationManager();
        questionnaireStage=answers.renovationStage();
        questionnaireVersion=answers.questionnaireVersion();
    }
    private UUID ownerId;
    public UUID getOwnerId() { return ownerId; }
    public void setOwnerId(UUID ownerId) { this.ownerId = ownerId; }

    protected Project() {}

    public static Project draft(BigDecimal areaM2, String address, String name) {
        Project p = new Project();
        p.projectId = UUID.randomUUID();
        p.status = ProjectStatus.DRAFT;
        p.completedStep = 1;
        p.areaM2 = areaM2;
        p.address = address;
        p.name = name;
        p.nameSource = NameSource.AUTO;
        p.kitchensCount = 1;
        p.bathroomsCount = 1;
        p.redevelopment = false;
        p.estimateStatus = EstimateStatus.NOT_REQUESTED;
        p.updatedAt = Instant.now();
        return p;
    }

    public UUID getProjectId(){return projectId;} public ProjectStatus getStatus(){return status;} public void setStatus(ProjectStatus v){status=v;}
    public int getCompletedStep(){return completedStep;} public void setCompletedStep(int v){completedStep=v;}
    public String getName(){return name;} public void setName(String v){name=v;} public NameSource getNameSource(){return nameSource;} public void setNameSource(NameSource v){nameSource=v;}
    public BigDecimal getAreaM2(){return areaM2;} public void setAreaM2(BigDecimal v){areaM2=v;} public String getAddress(){return address;} public void setAddress(String v){address=v;}
    public CurrentState getCurrentState(){return currentState;} public void setCurrentState(CurrentState v){currentState=v;} public TargetState getTargetState(){return targetState;} public void setTargetState(TargetState v){targetState=v;}
    public Integer getKitchensCount(){return kitchensCount;} public void setKitchensCount(Integer v){kitchensCount=v;} public Integer getBathroomsCount(){return bathroomsCount;} public void setBathroomsCount(Integer v){bathroomsCount=v;}
    public Boolean getRedevelopment(){return redevelopment;} public void setRedevelopment(Boolean v){redevelopment=v;} public FinishLevel getFinishLevel(){return finishLevel;} public void setFinishLevel(FinishLevel v){finishLevel=v;}
    public EstimateStatus getEstimateStatus(){return estimateStatus;} public void setEstimateStatus(EstimateStatus v){estimateStatus=v;}
    public Integer getBudgetMinRub(){return budgetMinRub;} public void setBudgetMinRub(Integer v){budgetMinRub=v;} public Integer getBudgetMaxRub(){return budgetMaxRub;} public void setBudgetMaxRub(Integer v){budgetMaxRub=v;}
    public Integer getDurationMinDays(){return durationMinDays;} public void setDurationMinDays(Integer v){durationMinDays=v;} public Integer getDurationMaxDays(){return durationMaxDays;} public void setDurationMaxDays(Integer v){durationMaxDays=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;} public long getVersion(){return version;}
}
