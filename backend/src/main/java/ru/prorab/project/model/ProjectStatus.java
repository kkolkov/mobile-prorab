package ru.prorab.project.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public enum ProjectStatus { @JsonProperty("draft") DRAFT,@JsonProperty("active") ACTIVE,@JsonProperty("completed") COMPLETED }
