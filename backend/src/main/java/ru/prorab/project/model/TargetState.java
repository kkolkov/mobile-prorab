package ru.prorab.project.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public enum TargetState { @JsonProperty("finish_only") FINISH_ONLY,@JsonProperty("move_in_ready") MOVE_IN_READY,@JsonProperty("fully_furnished") FULLY_FURNISHED }
