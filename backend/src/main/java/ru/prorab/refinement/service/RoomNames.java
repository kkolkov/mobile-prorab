package ru.prorab.refinement.service;
import java.util.*;
import ru.prorab.refinement.model.RefinementData.Room;
final class RoomNames {
 private static final Map<String,String> LABELS=Map.of("living","Жилая комната","kitchen","Кухня","combined_bathroom","Совмещённый санузел","bathroom","Ванная","toilet","Туалет","corridor","Коридор","wardrobe","Гардеробная","storage","Кладовая","other","Другое помещение");
 static String forRoom(Room room,List<Room> rooms){
  int number=0;
  for(var peer:rooms){
   if(peer!=null&&room.type().equals(peer.type()))number++;
   if(peer!=null&&room.id().equals(peer.id()))break;
  }
  return LABELS.getOrDefault(room.type(),"Помещение")+" "+Math.max(1,number);
 }
}
