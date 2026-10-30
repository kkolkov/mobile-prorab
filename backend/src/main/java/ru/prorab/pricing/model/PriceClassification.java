package ru.prorab.pricing.model;
import java.util.*;
import ru.prorab.pricing.entity.PriceMatrixEntry;
public final class PriceClassification {
 private PriceClassification(){}
 public static final Map<String,List<String>> GROUPS=Map.of("work",List.of("rough","finish","demolition"),"material",List.of("rough","finish"),"equipment",List.of("appliance","lighting","fittings","plumbing"));
 public record Category(String category,String subcategory){}
 public static Category of(PriceMatrixEntry p){
  if(p.getCategory()!=null)return new Category(p.getCategory(),p.getSubcategory());
  String c=p.getCode().toLowerCase(Locale.ROOT),t=p.getTitle().toLowerCase(Locale.ROOT);
  boolean work=c.contains(".work.")||c.startsWith("ref.l_")||p.getLaborShare().compareTo(java.math.BigDecimal.ONE)==0||c.equals("demolition");
  if(work)return new Category("work",t.contains("демонтаж")?"demolition":rough(t)?"rough":"finish");
  if(t.matches(".*(стираль|сушиль|холодиль|посудомо|духов|вароч|вытяж|микроволн|техник|базовый прибор).*"))return new Category("equipment","appliance");
  if(t.matches(".*(электр|свет|освещ|розет|выключ|кабел|провод|щит).*"))return new Category("equipment","lighting");
  if(t.matches(".*(унитаз|ванн|раковин|смесител|сантех|душ|инсталляц|полотенцесуш).*"))return new Category("equipment","plumbing");
  if(t.matches(".*(фасад|столешниц|двер|гарнитур|мебел|кухон).*"))return new Category("equipment","fittings");
  return new Category("material",rough(t)||p.getRoughShare().signum()>0?"rough":"finish");
 }
 private static boolean rough(String t){return t.matches(".*(стяжк|штукатур|подготов|электр|развод|кабел|труб|утепл|грунт|шпакл|гидроизол|цемент|смесь).*");}
 public static String name(PriceMatrixEntry p){
  String title=p.getTitle().replaceFirst("(?iu)^(работа|работы|материал|материалы|оборудование)\\s*(?:[&:/—-]\\s*|\\s+)","").strip();
  if(!title.isEmpty())title=title.substring(0,1).toUpperCase(Locale.forLanguageTag("ru"))+title.substring(1);
  return title;
 }
 public static String title(PriceMatrixEntry p,Category c){
  return switch(c.category()){case "work"->"Работа ";case "equipment"->"Оборудование ";default->"Материалы ";}+name(p);
 }
}
