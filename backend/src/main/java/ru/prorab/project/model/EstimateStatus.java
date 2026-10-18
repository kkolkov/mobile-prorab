package ru.prorab.project.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public enum EstimateStatus { @JsonProperty("not_requested") NOT_REQUESTED,@JsonProperty("pending") PENDING,@JsonProperty("ready") READY,@JsonProperty("failed") FAILED,@JsonProperty("stale") STALE }
