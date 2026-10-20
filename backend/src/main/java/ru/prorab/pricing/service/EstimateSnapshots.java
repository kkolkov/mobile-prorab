package ru.prorab.pricing.service;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import ru.prorab.refinement.dto.RefinedEstimate;

@Component
public class EstimateSnapshots {
    private final ObjectMapper json;
    public EstimateSnapshots(ObjectMapper json){this.json=json;}
    public String write(RefinedEstimate estimate){try{return json.writeValueAsString(estimate);}catch(JsonProcessingException e){throw new IllegalStateException("Cannot store estimate",e);}}
    public RefinedEstimate read(String value){if(value==null)return null;try{return json.readValue(value,RefinedEstimate.class);}catch(JsonProcessingException e){throw new IllegalStateException("Invalid estimate snapshot",e);}}
}
