package ru.prorab.onboarding.dto;
import java.time.Instant;
import java.util.UUID;
public record AccessResponse(String userGroup, String assignmentSource, UUID firstProjectId,
 boolean questionnaireRequired, boolean questionnaireShown, String questionnaireVersion,
 Boolean firstRenovation, String renovationManager, String renovationStage,
 Instant questionnaireCompletedAt, Instant freemiumStartedAt, Instant freemiumEndsAt,
 boolean offerShown, boolean trialEligible, boolean fullAccess, String subscriptionStatus, long version) {}
