package ru.prorab.project.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public enum FinishLevel { @JsonProperty("budget") BUDGET,@JsonProperty("comfort") COMFORT,@JsonProperty("business") BUSINESS }
