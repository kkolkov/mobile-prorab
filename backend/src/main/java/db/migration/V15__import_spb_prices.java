package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import ru.prorab.pricing.model.SpbPrices;
import java.math.BigDecimal;
import java.sql.Date;

public class V15__import_spb_prices extends BaseJavaMigration {
    @Override public void migrate(Context context)throws Exception{
        var connection=context.getConnection();
        try(var insert=connection.prepareStatement("INSERT INTO price_matrix(code,title,unit,unit_price_rub,rough_share,labor_share,source_note,price_date,version,verified) VALUES(?,?,?,?,?,?,?,?,0,FALSE)")){
            for(var row:SpbPrices.ROWS){
                insert.setString(1,row.get("code").asText());insert.setString(2,row.get("title").asText());insert.setString(3,row.get("unit").asText());
                insert.setBigDecimal(4,new BigDecimal(row.get("price").asText()));insert.setBigDecimal(5,new BigDecimal(row.get("rough").asText()));insert.setBigDecimal(6,new BigDecimal(row.get("labor").asText()));
                insert.setString(7,row.get("source").asText());insert.setDate(8,Date.valueOf(row.get("date").asText()));insert.addBatch();
            }
            insert.executeBatch();
        }
    }
}
