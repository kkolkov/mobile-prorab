package ru.prorab.onboarding.entity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="user_access")
public class UserAccess {
 @Id public UUID userId;
 @Column(length=1,nullable=false) public String userGroup;
 @Column(length=30,nullable=false) public String assignmentSource;
 @Column(nullable=false) public UUID firstProjectId;
 @Column(nullable=false) public Instant assignedAt;
 public boolean questionnaireShown;
 public boolean offerShown;
 @Column(length=20) public String questionnaireVersion;
 public Boolean firstRenovation;
 @Column(length=40) public String renovationManager;
 @Column(length=30) public String renovationStage;
 public Instant questionnaireCompletedAt;
 public Instant freemiumStartedAt;
 public Instant freemiumEndsAt;
 @Column(length=20,nullable=false) public String subscriptionStatus="not_connected";
 @Version public long version;
}
