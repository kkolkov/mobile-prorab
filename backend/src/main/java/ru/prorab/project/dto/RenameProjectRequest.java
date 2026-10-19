package ru.prorab.project.dto;
import jakarta.validation.constraints.*;
public record RenameProjectRequest(@NotBlank @Size(max=100) String name, @NotNull @PositiveOrZero Long version) {}
