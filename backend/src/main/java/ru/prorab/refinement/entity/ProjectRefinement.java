package ru.prorab.refinement.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "project_refinements")
public class ProjectRefinement {
    @Id private UUID projectId;
    @Version private long version;
    @Column(nullable = false, columnDefinition = "text") private String inputJson;
    @Column(nullable = false) private long revision;
    @Column(columnDefinition = "text") private String activeEstimateJson;
    @Column(columnDefinition = "text") private String candidateJson;
    @Column(columnDefinition = "text") private String activeInputJson;
    public String getActiveInputJson(){return activeInputJson;}
    public void setActiveInputJson(String value){activeInputJson=value;}
    private String calculationStatus = "not_requested";
    private UUID calculationId;
    private long calculationProjectVersion;
    public String getActiveEstimateJson(){return activeEstimateJson;}
    public void setActiveEstimateJson(String value){activeEstimateJson=value;}
    public String getCandidateJson(){return candidateJson;}
    public void setCandidateJson(String value){candidateJson=value;}
    public String getCalculationStatus(){return calculationStatus;}
    public void setCalculationStatus(String value){calculationStatus=value;}
    public UUID getCalculationId(){return calculationId;}
    public void setCalculationId(UUID value){calculationId=value;}
    public long getCalculationProjectVersion(){return calculationProjectVersion;}
    public void setCalculationProjectVersion(long value){calculationProjectVersion=value;}
    protected ProjectRefinement() {}
    public ProjectRefinement(UUID projectId, String inputJson) { this.projectId=projectId; this.inputJson=inputJson; }
    public UUID getProjectId(){return projectId;}
    public String getInputJson() { return inputJson; }
    public void setInputJson(String value) { inputJson=value; }
    public void incrementRevision(){revision++;}
    public long getRevision() { return revision; }
}
