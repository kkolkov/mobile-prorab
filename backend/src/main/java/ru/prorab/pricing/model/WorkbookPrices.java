package ru.prorab.pricing.model;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
/** Immutable supplement; existing migration resources remain unchanged. */
public final class WorkbookPrices {
 private WorkbookPrices(){}
 public static final JsonNode DATA=load();
 public static final List<JsonNode> ROWS=rows();
 public static final Set<String> RETIRED=retired();
 private static JsonNode load(){
  try(var in=WorkbookPrices.class.getResourceAsStream("/pricing/workbook-2026-10-29.json")){
   if(in==null)throw new IllegalStateException("Workbook price supplement missing");
   return new ObjectMapper().readTree(in);
  }catch(java.io.IOException e){throw new IllegalStateException(e);}
 }
 private static List<JsonNode> rows(){var result=new ArrayList<JsonNode>();DATA.get("rows").forEach(result::add);return List.copyOf(result);}
 private static Set<String> retired(){var result=new HashSet<String>();DATA.get("aliases").fieldNames().forEachRemaining(result::add);return Set.copyOf(result);}
}
