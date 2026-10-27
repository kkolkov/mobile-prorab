package ru.prorab.project.dto;
import com.fasterxml.jackson.annotation.JsonUnwrapped;
public record ProjectListResponse(@JsonUnwrapped ProjectResponse project, Integer executionProgressPercent) {}
