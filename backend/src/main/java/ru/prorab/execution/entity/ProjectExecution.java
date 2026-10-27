package ru.prorab.execution.entity;
import jakarta.persistence.*;
import java.util.UUID;
@Entity @Table(name="project_executions")
public class ProjectExecution {
 @Id private UUID projectId;
 @Version private long version;
 @Column(nullable=false,columnDefinition="text") private String stateJson;
 protected ProjectExecution(){}
 public ProjectExecution(UUID id,String state){projectId=id;stateJson=state;}
 public UUID getProjectId(){return projectId;}
 public long getVersion(){return version;}
 public String getStateJson(){return stateJson;}
 public void setStateJson(String state){stateJson=state;}
}
