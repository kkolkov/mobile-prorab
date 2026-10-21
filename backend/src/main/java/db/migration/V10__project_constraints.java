package db.migration;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import java.sql.Connection;
import java.util.ArrayList;

/** Older migrations let each DB name constraints, so PostgreSQL and H2 names differ. */
public class V10__project_constraints extends BaseJavaMigration {
 @Override public void migrate(Context context)throws Exception {
  var c=context.getConnection();
  replace(c,"projects","CHECK","ALTER TABLE projects ADD CONSTRAINT projects_rooms_count_check CHECK (rooms_count >= 0)");
  for(String table:new String[]{"project_refinements","project_executions"})
   replace(c,table,"FOREIGN KEY","ALTER TABLE "+table+" ADD CONSTRAINT "+table+"_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE");
 }
 private void replace(Connection c,String table,String type,String sql)throws Exception {
  var names=new ArrayList<String>();
  String query="SELECT t.constraint_name FROM information_schema.table_constraints t WHERE LOWER(t.table_name)=? AND t.constraint_type=? AND LOWER(t.table_schema)='public'";
  if(type.equals("CHECK"))query+=" AND EXISTS (SELECT 1 FROM information_schema.check_constraints c WHERE c.constraint_name=t.constraint_name AND c.constraint_schema=t.constraint_schema AND LOWER(c.check_clause) LIKE '%rooms_count%')";
  try(var q=c.prepareStatement(query)){
   q.setString(1,table);q.setString(2,type);try(var r=q.executeQuery()){while(r.next())names.add(r.getString(1));}
  }
  try(var statement=c.createStatement()){
   for(String name:names)statement.execute("ALTER TABLE "+table+" DROP CONSTRAINT \""+name.replace("\"","\"\"")+"\"");
   statement.execute(sql);
  }
 }
}
