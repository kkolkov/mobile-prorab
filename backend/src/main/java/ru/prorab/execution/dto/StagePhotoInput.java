package ru.prorab.execution.dto;
import jakarta.validation.constraints.*;
public record StagePhotoInput(@NotBlank @Size(max=2800000) String dataUrl) {}
