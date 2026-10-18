package ru.prorab.project.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public enum CurrentState { @JsonProperty("no_finish") NO_FINISH,@JsonProperty("white_box") WHITE_BOX,@JsonProperty("old_finish") OLD_FINISH,@JsonProperty("lived_in") LIVED_IN }
