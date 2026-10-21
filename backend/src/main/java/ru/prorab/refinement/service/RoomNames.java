package ru.prorab.refinement.service;
import java.util.*;
import ru.prorab.refinement.model.RefinementData.Room;
final class RoomNames {
 private static final Map<String,String> LABELS=Map.of("living","Жилая комната","kitchen","Кухня","combined_bathroom","Совмещённый санузел","bathroom","Ванная","toilet","Туалет","corridor","Коридор","wardrobe","Гардеробная","storage","Кладовая","other","Другое помещение");
 static String next(String type,List<Room> rooms){
  var peers=rooms.stream().filter(r->type.equals(r.type())).collect(java.util.stream.Collectors.toMap(Room::id,r->r,(a,b)->b)).values();
  int number=peers.size();
  for(var r:peers){var m=java.util.regex.Pattern.compile(" (\\d+)$").matcher(r.name());if(m.find())try{number=Math.max(number,Integer.parseInt(m.group(1)));}catch(NumberFormatException ignored){}}
  return LABELS.getOrDefault(type,"Помещение")+" "+((long)number+1);
 }
}
