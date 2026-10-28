package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import ru.prorab.pricing.model.ImportedPrices;
import java.math.BigDecimal;
import java.sql.Date;

public class V13__import_price_catalogs extends BaseJavaMigration {
    @Override public void migrate(Context context)throws Exception{
        var connection=context.getConnection();
        try(var s=connection.createStatement()){
            s.execute("ALTER TABLE price_matrix ALTER COLUMN code TYPE VARCHAR(120)");
            s.execute("ALTER TABLE price_matrix ALTER COLUMN title TYPE VARCHAR(300)");
            s.execute("ALTER TABLE price_matrix ALTER COLUMN unit TYPE VARCHAR(80)");
            s.execute("ALTER TABLE price_matrix ALTER COLUMN source_note TYPE VARCHAR(4000)");
        }
        try(var insert=connection.prepareStatement("INSERT INTO price_matrix(code,title,unit,unit_price_rub,rough_share,labor_share,source_note,price_date,version,verified) VALUES(?,?,?,?,?,?,?,?,0,FALSE)")){
            for(var row:ImportedPrices.ROWS){
                insert.setString(1,row.get("code").asText());insert.setString(2,row.get("title").asText());insert.setString(3,row.get("unit").asText());
                insert.setBigDecimal(4,new BigDecimal(row.get("price").asText()));insert.setBigDecimal(5,new BigDecimal(row.get("rough").asText()));insert.setBigDecimal(6,new BigDecimal(row.get("labor").asText()));
                insert.setString(7,row.get("source").asText());insert.setDate(8,Date.valueOf(row.get("date").asText()));insert.addBatch();
            }
            insert.executeBatch();
        }
    }
}
