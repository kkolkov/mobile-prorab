package ru.prorab.pricing.model;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import java.io.IOException;

/** Immutable import metadata; live monetary values are always read from the database. */
public final class SpbPrices {
    private SpbPrices(){}
    public static final List<JsonNode> ROWS=load();
    private static List<JsonNode> load(){
        try(var in=SpbPrices.class.getResourceAsStream("/pricing/spb-2026-10-28.json")){
            if(in==null)throw new IllegalStateException("Price import missing");
            var rows=new ArrayList<JsonNode>();new ObjectMapper().readTree(in).forEach(rows::add);return List.copyOf(rows);
        }catch(IOException e){throw new IllegalStateException(e);}
    }
}
