package ru.prorab.onboarding.dto;
import jakarta.validation.constraints.*;
public record AnswersRequest(@NotNull Boolean firstRenovation,
 @NotNull @Pattern(regexp="self|turnkey_team|designer_or_management") String renovationManager,
 @NotNull @Pattern(regexp="planning|in_progress|completed") String renovationStage,
 @NotNull @Pattern(regexp="1") String questionnaireVersion) {}
