package ru.prorab.refinement.dto;
import ru.prorab.refinement.model.RefinementData.Room;
import java.util.List;
public record RoomsInput(List<Room> rooms, boolean roomCountManual, boolean generateDefaultLayout) {
 public RoomsInput(List<Room> rooms,boolean roomCountManual){this(rooms,roomCountManual,false);}
}
