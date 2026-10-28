package db.migration;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.sql.Date;
public class V14__time_norms extends BaseJavaMigration {
 @Override public void migrate(Context context)throws Exception{
  try(var s=context.getConnection().createStatement()){
   s.execute("CREATE TABLE time_norms(code VARCHAR(80) PRIMARY KEY,title VARCHAR(200) NOT NULL,person_hours_per100m2 NUMERIC(12,4) NOT NULL CHECK(person_hours_per100m2>0),source_note VARCHAR(4000) NOT NULL,source_date DATE NOT NULL,version BIGINT NOT NULL DEFAULT 0)");
  }
  try(var in=getClass().getResourceAsStream("/pricing/time-norms-2026-10-28.json");var insert=context.getConnection().prepareStatement("INSERT INTO time_norms(code,title,person_hours_per100m2,source_note,source_date) VALUES(?,?,?,?,?)")){
   if(in==null)throw new IllegalStateException("Time norms missing");
   for(var r:new ObjectMapper().readTree(in)){
    insert.setString(1,r.get("code").asText());insert.setString(2,r.get("title").asText());insert.setBigDecimal(3,new BigDecimal(r.get("hours").asText()));insert.setString(4,r.get("source").asText());insert.setDate(5,Date.valueOf(r.get("date").asText()));insert.addBatch();
   }insert.executeBatch();
  }
 }
}
