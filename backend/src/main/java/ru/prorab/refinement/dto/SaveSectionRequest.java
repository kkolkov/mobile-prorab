package ru.prorab.refinement.dto;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotNull;
import java.util.Set;
import java.util.UUID;
public record SaveSectionRequest(@NotNull Long version, @NotNull JsonNode data, Set<UUID> confirmedRemovals) {}
