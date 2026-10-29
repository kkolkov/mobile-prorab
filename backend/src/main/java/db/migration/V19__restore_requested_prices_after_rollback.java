package db.migration;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
/** V17/V18 were already applied before the rollback. Never rewrite their history. */
public class V19__restore_requested_prices_after_rollback extends BaseJavaMigration {
 @Override public void migrate(Context context)throws Exception {
  new V17__update_workbook_prices().migrate(context);
  try(var s=context.getConnection().createStatement()){
   s.executeUpdate("UPDATE price_matrix SET title=UPPER(SUBSTRING(TRIM(title),1,1)) || SUBSTRING(TRIM(title),2),version=version+1 WHERE title<>UPPER(SUBSTRING(TRIM(title),1,1)) || SUBSTRING(TRIM(title),2)");
  }
 }
}
