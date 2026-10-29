package ru.prorab.pricing.model;
import java.util.List;
public final class PriceDefinitions {
 private PriceDefinitions(){}
 public record Definition(String code,String title,String unit){}
 private static final List<Definition> LEGACY=List.of(
  new Definition("floor","Напольное покрытие с укладкой","м²"),
  new Definition("wall","Отделка стен","м²"),new Definition("ceiling","Отделка потолка","м²"),
  new Definition("preparation","Подготовка поверхности","м²"),new Definition("demolition","Демонтаж отделки","м²"),
  new Definition("electrical","Электрическая точка с монтажом","точка"),new Definition("plumbing","Сантехническая точка с прибором","точка"),
  new Definition("joinery","Базовый комплект мебели 3 пог. м","комплект"),new Definition("equipment","Базовый прибор с подключением","шт."),
  new Definition("glazing","Новое остекление с монтажом","м²"));
 public static final List<Definition> ALL=definitions();
 private static List<Definition> definitions(){
  var map=new java.util.LinkedHashMap<String,Definition>();
  LEGACY.forEach(d->map.put(d.code(),d));
  for(var rows:List.of(ImportedPrices.ROWS,SpbPrices.ROWS,WorkbookPrices.ROWS))for(var r:rows)
   map.put(r.get("code").asText(),new Definition(r.get("code").asText(),r.get("title").asText(),r.get("unit").asText()));
  WorkbookPrices.RETIRED.forEach(map::remove);
  return List.copyOf(map.values());
 }
}
