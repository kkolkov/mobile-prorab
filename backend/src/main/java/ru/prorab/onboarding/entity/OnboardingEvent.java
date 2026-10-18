package ru.prorab.onboarding.entity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="onboarding_events")
public class OnboardingEvent {
 @Id public UUID id;
 public UUID userId;
 public UUID projectId;
 @Column(length=80) public String eventName;
 public Instant occurredAt;
 @Column(columnDefinition="text") public String details;
}
