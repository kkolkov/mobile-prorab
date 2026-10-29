package ru.prorab.pricing.model;

/** Presentation grouping only: never changes quantities, rates or totals. */
public enum CostCategory {
 ROUGH("Черновые работы", "Демонтаж, стяжка, штукатурка, электрика, разводка труб"),
 FINISH("Чистовые работы", "Укладка пола и плитки, поклейка обоев, покраска"),
 DOORS_CEILINGS("Двери и потолки", "Монтаж и материалы"),
 EQUIPMENT("Сантехника и кухня", "Монтаж и оборудование"),
 OTHER("Дополнительные работы и материалы", "Остекление, утепление и другие позиции вне основных разделов");
 public final String title, description;
 CostCategory(String title,String description){this.title=title;this.description=description;}
 public static CostCategory forPrice(String code,String section){
  if(code.startsWith("spb.glazing.")||code.startsWith("spb.insulation.")||code.equals("glazing"))return OTHER;
  if(section.equals("kitchen")||code.startsWith("spb.kitchen.")||code.startsWith("ref.K_")||code.startsWith("ref.A_"))return EQUIPMENT;
  if(code.startsWith("ref.C_")||code.startsWith("ref.D_")||code.startsWith("ref.L_door_")||code.startsWith("ref.L_stretch_")||code.equals("ref.L_gkl")||code.equals("rule.stretch.minimum")||code.endsWith(".paint_ceiling")||code.equals("ceiling"))return DOORS_CEILINGS;
  if(code.startsWith("ref.E_")||code.startsWith("ref.P_")||code.startsWith("ref.L_demo_")||code.startsWith("ref.L_chase_")||code.startsWith("ref.L_box_")||code.startsWith("ref.L_socket_"))return ROUGH;
  if(java.util.Set.of("ref.L_cable","ref.L_backbox","ref.L_light","ref.L_pipe_water","ref.L_water_points","ref.L_sewer","ref.L_sewer_points","electrical","preparation","demolition").contains(code)||code.endsWith(".plaster_wall")||code.endsWith(".screed"))return ROUGH;
  if(code.startsWith("average.")||code.startsWith("ref.F_")||code.startsWith("ref.W_")||java.util.Set.of("ref.L_spc","ref.L_decor","floor","wall").contains(code))return FINISH;
  if(code.startsWith("ref.L_basin")||code.startsWith("ref.L_bath")||code.startsWith("ref.L_wc")||code.startsWith("ref.L_kitchen_")||code.startsWith("ref.L_mixer")||java.util.Set.of("ref.L_siphon","ref.L_washer","plumbing","equipment").contains(code))return EQUIPMENT;
  return OTHER;
 }
}
