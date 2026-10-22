package ru.prorab.execution.entity;
import jakarta.persistence.*;
import java.util.UUID;
@Entity @Table(name="stage_photos")
public class StagePhoto {
 @Id private UUID id;
 @Column(nullable=false) private UUID projectId;
 @Column(nullable=false,columnDefinition="bytea") private byte[] image;
 protected StagePhoto(){}
 public StagePhoto(UUID id,UUID projectId,byte[] image){this.id=id;this.projectId=projectId;this.image=image;}
 public byte[] getImage(){return image;}
}
