package db.migration;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import ru.prorab.pricing.model.WorkbookPrices;
import java.math.BigDecimal;
import java.sql.Date;

public class V17__update_workbook_prices extends BaseJavaMigration {
 @Override public void migrate(Context context)throws Exception{
  var c=context.getConnection();
  try(var update=c.prepareStatement("UPDATE price_matrix SET title=?,unit=?,unit_price_rub=?,rough_share=?,labor_share=?,source_note=?,price_date=?,verified=FALSE,version=version+1 WHERE code=?");
      var insert=c.prepareStatement("INSERT INTO price_matrix(title,unit,unit_price_rub,rough_share,labor_share,source_note,price_date,code,verified,version) VALUES(?,?,?,?,?,?,?,?,FALSE,0)");
      var remove=c.prepareStatement("DELETE FROM price_matrix WHERE code=?")){
   for(var r:WorkbookPrices.ROWS){
    for(var statement:java.util.List.of(update,insert)){
     statement.setString(1,r.get("title").asText());statement.setString(2,r.get("unit").asText());
     statement.setBigDecimal(3,new BigDecimal(r.get("price").asText()));statement.setBigDecimal(4,new BigDecimal(r.get("rough").asText()));statement.setBigDecimal(5,new BigDecimal(r.get("labor").asText()));
     statement.setString(6,r.get("source").asText());statement.setDate(7,Date.valueOf(r.get("date").asText()));statement.setString(8,r.get("code").asText());
    }
    if(update.executeUpdate()==0)insert.executeUpdate();
   }
   for(var code:WorkbookPrices.RETIRED){remove.setString(1,code);remove.addBatch();}remove.executeBatch();
  }
 }
}
