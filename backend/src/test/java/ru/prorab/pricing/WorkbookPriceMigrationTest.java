package ru.prorab.pricing;
import org.junit.jupiter.api.Test;
import org.flywaydb.core.Flyway;
import java.sql.DriverManager;
import java.math.BigDecimal;
import java.util.*;
import ru.prorab.pricing.model.*;
import static org.junit.jupiter.api.Assertions.*;
class WorkbookPriceMigrationTest {
 @Test void reappliesPricesAfterAnAlreadyMigratedDatabaseWasRolledBack()throws Exception{
  String url="jdbc:h2:mem:workbook-rollback-upgrade;MODE=PostgreSQL;DB_CLOSE_DELAY=-1";
  Flyway.configure().dataSource(url,"sa","").target("18").load().migrate();
  try(var c=DriverManager.getConnection(url,"sa","");var s=c.createStatement()){
   s.executeUpdate("UPDATE price_matrix SET unit_price_rub=341.88,title='укладка ламината' WHERE code='average.work.laminate'");
   s.executeUpdate("DELETE FROM price_matrix WHERE code='ref.L_kitchen_hob'");
  }
  Flyway.configure().dataSource(url,"sa","").load().migrate();
  try(var c=DriverManager.getConnection(url,"sa","");var s=c.createStatement()){
   try(var r=s.executeQuery("SELECT unit_price_rub,title FROM price_matrix WHERE code='average.work.laminate'")){assertTrue(r.next());assertEquals(1090,r.getInt(1));assertTrue(Character.isUpperCase(r.getString(2).charAt(0)));}
   try(var r=s.executeQuery("SELECT unit_price_rub FROM price_matrix WHERE code='ref.L_kitchen_hob'")){assertTrue(r.next());assertEquals(2040,r.getInt(1));}
  }
 }
 @Test void upgradesExistingCatalogWithoutDuplicatesOrChangingUnmatchedRates()throws Exception{
  String url="jdbc:h2:mem:workbook-upgrade;MODE=PostgreSQL;DB_CLOSE_DELAY=-1";
  Flyway.configure().dataSource(url,"sa","").target("16").load().migrate();
  try(var c=DriverManager.getConnection(url,"sa","");var statement=c.createStatement()){
   statement.executeUpdate("UPDATE price_matrix SET unit_price_rub=7777,version=2,verified=TRUE WHERE code='average.material.laminate'");
   statement.executeUpdate("UPDATE price_matrix SET version=4,verified=TRUE WHERE code='average.work.laminate'");
  }
  var migration=Flyway.configure().dataSource(url,"sa","").load();migration.migrate();
  assertEquals(0,migration.migrate().migrationsExecuted);
  try(var c=DriverManager.getConnection(url,"sa","");var statement=c.createStatement()){
   var codes=new HashSet<String>();try(var rs=statement.executeQuery("SELECT code,title FROM price_matrix")){while(rs.next()){assertTrue(codes.add(rs.getString(1)));assertTrue(Character.isUpperCase(rs.getString(2).codePointAt(0)),rs.getString(2));}}
   assertEquals(500,codes.size());assertEquals(PriceDefinitions.ALL.size(),codes.size());
   for(var d:PriceDefinitions.ALL)assertTrue(codes.contains(d.code()));
   for(String code:WorkbookPrices.RETIRED)assertFalse(codes.contains(code));
   for(var row:WorkbookPrices.ROWS){
    try(var q=c.prepareStatement("SELECT unit_price_rub,unit,source_note FROM price_matrix WHERE code=?")){
     q.setString(1,row.get("code").asText());try(var rs=q.executeQuery()){
      assertTrue(rs.next());assertEquals(0,rs.getBigDecimal(1).compareTo(new BigDecimal(row.get("price").asText())));
      assertEquals(row.get("unit").asText(),rs.getString(2));assertTrue(rs.getString(3).contains("Сбор_данных_для_калькулятора.xlsx"));
     }
    }
   }
   try(var rs=statement.executeQuery("SELECT unit_price_rub,version,verified FROM price_matrix WHERE code='average.work.laminate'")){
    rs.next();assertEquals(1090,rs.getInt(1));assertTrue(rs.getInt(2)>=6);assertFalse(rs.getBoolean(3));
   }
   try(var rs=statement.executeQuery("SELECT unit_price_rub,version,verified FROM price_matrix WHERE code='average.material.laminate'")){
    rs.next();assertEquals(7777,rs.getInt(1));assertEquals(2,rs.getInt(2));assertTrue(rs.getBoolean(3));
   }
  }
 }
}
