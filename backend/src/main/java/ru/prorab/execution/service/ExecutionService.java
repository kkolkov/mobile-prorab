package ru.prorab.execution.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import ru.prorab.common.exception.*;
import ru.prorab.project.entity.Project;
import ru.prorab.project.model.ProjectStatus;
import ru.prorab.project.repository.ProjectRepository;
import ru.prorab.refinement.dto.RefinedEstimate;
import ru.prorab.execution.entity.ProjectExecution;
import ru.prorab.execution.repository.ExecutionRepository;
import ru.prorab.execution.model.ExecutionState;
import ru.prorab.execution.model.ExecutionState.*;
import ru.prorab.execution.dto.*;
import java.math.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
@Service
public class ExecutionService {
 private final ProjectRepository projects;private final ExecutionRepository executions;private final ObjectMapper json;private final StagePhotoService photos;
 public ExecutionService(ProjectRepository p,ExecutionRepository e,ObjectMapper j,StagePhotoService photos){projects=p;executions=e;json=j;this.photos=photos;}
 @Transactional(readOnly=true) public Map<UUID,Integer> progressFor(Collection<UUID> ids){
  Map<UUID,Integer> result=new HashMap<>();
  for(var record:executions.findAllById(ids)){
   var state=read(record.getStateJson(),ExecutionState.class);
   if(state.startDate()!=null&&!state.startDate().isAfter(LocalDate.now())&&!state.tasks().isEmpty())result.put(record.getProjectId(),progress(state));
  }
  return result;
 }
 public static String repairStatus(ExecutionState state,LocalDate today){
  if(state.startDate()==null||state.startDate().isAfter(today)||state.tasks().isEmpty())return "planning";
  return progress(state)==100?"completed":"in_progress";
 }
 @Transactional(readOnly=true) public String repairStatus(UUID id){
  return executions.findById(id).map(record->repairStatus(read(record.getStateJson(),ExecutionState.class),LocalDate.now())).orElse("planning");
 }
 static int progress(ExecutionState state){return state.tasks().isEmpty()?0:(int)(100*state.tasks().stream().filter(t->t.status().equals("completed")).count()/state.tasks().size());}
 @Transactional public ExecutionResponse get(UUID id){var p=project(id);return response(p,prepare(p));}
 @Transactional public ExecutionResponse command(UUID id,String action,ExecutionCommand c){
  var p=project(id);var record=prepare(p);var s=read(record.getStateJson(),ExecutionState.class);
  var expenses=new ArrayList<>(s.expenses());var tasks=new ArrayList<>(s.tasks());var history=new ArrayList<>(s.history());
  // Stable expense IDs make retry after a lost response safe; a different payload is never silently accepted.
  if(action.equals("expense")&&c.expenseId()!=null){var prior=expenses.stream().filter(e->e.id().equals(c.expenseId())).findFirst();if(prior.isPresent()){
   var e=prior.get();if(Objects.equals(e.title(),c.title())&&e.amount().compareTo(c.amount()==null?BigDecimal.ZERO:c.amount())==0&&Objects.equals(e.category(),c.category())&&Objects.equals(e.date(),c.date())&&Objects.equals(e.taskId(),c.taskId())&&photos.sameReceipt(id,e.receiptPhotoId(),c.receipt()))return response(p,record);
   throw new BusinessException("Этот идентификатор расхода уже использован");}}
  if(c.version()==null||c.version()!=record.getVersion())throw new ObjectOptimisticLockingFailureException(ProjectExecution.class,id);
  if(!action.equals("complete")&&c.photos()!=null&&!c.photos().isEmpty())throw new BusinessException("Фотографии можно добавить при завершении этапа");
  if(!action.equals("expense")&&c.receipt()!=null)throw new BusinessException("Чек прикрепляется при создании расхода");
  var budget=s.budget();var start=s.startDate();String message;List<UUID> newPhotos=List.of();
  switch(action){
   case "sync"->{
    var latest=estimate(p);if(latest==null||!Objects.equals(c.estimateId(),latest.id()))throw new BusinessException("Применённая смета изменилась. Обновите данные");
    if(budget!=null&&budget.id().equals(latest.id()))return response(p,record);
    budget=latest;message="План бюджета обновлён из применённой сметы. Расходы и начатый график сохранены";
   }
   case "start"->{
    if(start!=null)throw new BusinessException("График уже начат");
    if(budget==null||budget.timePlan()==null)throw new BusinessException("Сначала рассчитайте и примените смету с графиком этапов");
    date(c.date());start=c.date();LocalDate cursor=start;
    for(var phase:budget.timePlan().phases()){
     var end=cursor.plusDays(phase.durationDays()-1L);
     tasks.add(new Task(phase.id(),phase.title(),phase.durationDays(),cursor,end,cursor,end,tasks.isEmpty()?"in_progress":"planned",null,phase.dependencies()));cursor=end.plusDays(1);
    }message="Начало ремонта: "+start;
   }
   case "reschedule"->{
    date(c.date());
    int index=-1;for(int i=0;i<tasks.size();i++)if(tasks.get(i).id().equals(c.taskId()))index=i;
    if(index<0)throw new BusinessException("Этап не найден");
    if(tasks.get(index).status().equals("completed"))throw new BusinessException("Завершённый этап нельзя перенести");
    if(index>0&&!c.date().isAfter(tasks.get(index-1).endDate()))throw new BusinessException("Начало этапа должно быть после завершения предыдущего этапа");
    if(index==0)start=c.date();
    LocalDate cursor=c.date();
    for(int i=index;i<tasks.size();i++){
     var t=tasks.get(i);if(t.status().equals("completed"))throw new BusinessException("Завершённый этап нельзя перенести");
     var end=cursor.plusDays(t.durationDays()-1L);
     tasks.set(i,new Task(t.id(),t.title(),t.durationDays(),t.baselineStart(),t.baselineEnd(),cursor,end,t.status(),t.completedDate(),t.dependencies()));cursor=end.plusDays(1);
    }
    message="Начало этапа «"+tasks.get(index).title()+"» перенесено на "+c.date()+". Последующие этапы сдвинуты с сохранением длительностей";
   }
   case "shift","complete"->{
    int index=-1;for(int i=0;i<tasks.size();i++)if(tasks.get(i).id().equals(c.taskId()))index=i;
    if(index<0)throw new BusinessException("Этап не найден");var task=tasks.get(index);
    if(task.status().equals("completed"))throw new BusinessException("Этап уже завершён");
    LocalDate end;
    if(action.equals("shift")){
     if(c.days()==null||c.days()<1||c.days()>365)throw new BusinessException("Укажите от 1 до 365 дней");
     end=task.endDate().plusDays(c.days());
     message=task.title()+": +"+c.days()+" дн.";
    }else{
     if(!task.status().equals("in_progress"))throw new BusinessException("Сначала завершите предыдущий этап");
     date(c.date());if(c.date().isBefore(task.startDate())||c.date().isAfter(LocalDate.now()))throw new BusinessException("Дата завершения должна быть между началом этапа и сегодняшним днём");
     if(task.id().equals("drying")&&c.date().isBefore(task.endDate()))throw new BusinessException("Технологическая пауза ещё не закончилась");
     newPhotos=photos.save(id,c.photos());end=c.date();message="Завершён этап «"+task.title()+"»: "+end;
    }
    String reason=c.reason()==null?"":c.reason().trim();if(!reason.isEmpty())message+=". "+reason;
    tasks.set(index,new Task(task.id(),task.title(),(int)ChronoUnit.DAYS.between(task.startDate(),end)+1,task.baselineStart(),task.baselineEnd(),task.startDate(),end,action.equals("complete")?"completed":task.status(),action.equals("complete")?end:null,task.dependencies()));
    LocalDate cursor=end.plusDays(1);
    for(int i=index+1;i<tasks.size();i++){
     var t=tasks.get(i);var nextEnd=cursor.plusDays(t.durationDays()-1L);
     tasks.set(i,new Task(t.id(),t.title(),t.durationDays(),t.baselineStart(),t.baselineEnd(),cursor,nextEnd,action.equals("complete")&&i==index+1?"in_progress":t.status(),t.completedDate(),t.dependencies()));cursor=nextEnd.plusDays(1);
    }
   }
   case "expense","edit-expense"->{
    if(budget==null)throw new BusinessException("Сначала получите смету проекта");
    if(c.expenseId()==null||c.title()==null||c.title().isBlank()||c.title().length()>160||c.amount()==null||c.amount().signum()<=0||c.amount().scale()>2||c.amount().compareTo(new BigDecimal("999999999"))>0)throw new BusinessException("Укажите название и положительную сумму с точностью до копеек");
    if(!Set.of("rough","finish","labor","extra").contains(Objects.toString(c.category(),"")))throw new BusinessException("Выберите категорию расхода");
    date(c.date());if(c.date().isAfter(LocalDate.now()))throw new BusinessException("Фактический расход не может быть в будущем");
    if(c.taskId()!=null&&tasks.stream().noneMatch(t->t.id().equals(c.taskId())))throw new BusinessException("Этап расхода не найден");
    var previous=expenses.stream().filter(e->e.id().equals(c.expenseId())).findFirst().orElse(null);
    UUID receiptId=action.equals("edit-expense")?(previous==null?null:previous.receiptPhotoId()):(c.receipt()==null?null:photos.saveReceipt(id,c.receipt()));
    var expense=new Expense(c.expenseId(),c.title().trim(),c.amount().setScale(2),c.category(),c.date(),c.taskId(),receiptId);
    if(action.equals("edit-expense")){int i=-1;for(int j=0;j<expenses.size();j++)if(expenses.get(j).id().equals(c.expenseId()))i=j;if(i<0)throw new BusinessException("Расход не найден");expenses.set(i,expense);}else expenses.add(expense);
    message=action.equals("expense")?"Добавлен расход":"Изменён расход";
   }
   case "remove-expense"->{expenses.stream().filter(e->e.id().equals(c.expenseId())).findFirst().ifPresent(e->photos.deleteReceipt(id,e.receiptPhotoId()));if(!expenses.removeIf(e->e.id().equals(c.expenseId())))throw new BusinessException("Расход не найден");message="Удалён расход";}
   default->throw new BusinessException("Неизвестная операция");
  }
  history.add(new Event(Instant.now(),message,action.equals("complete")?c.taskId():null,newPhotos));
  record.setStateJson(write(new ExecutionState(budget,start,List.copyOf(tasks),List.copyOf(expenses),List.copyOf(history))));executions.saveAndFlush(record);return response(p,record);
 }
 private ExecutionResponse response(Project p,ProjectExecution record){
  var s=read(record.getStateJson(),ExecutionState.class);var latest=estimate(p);var b=s.budget();
  BigDecimal plan=b==null?null:b.total().expected(),reserve=b==null?null:b.total().withReserve();
  BigDecimal spent=s.expenses().stream().map(Expense::amount).reduce(BigDecimal.ZERO,BigDecimal::add);
  var categories=new ArrayList<ExecutionResponse.Category>();var details=b==null?null:b.details();
  String[] keys={"rough","finish","labor","extra"},names={"Черновые материалы","Чистовые материалы и оснащение","Работы","Дополнительные расходы"};
  BigDecimal[] plans={details==null?null:details.roughMaterials(),details==null?null:details.finishMaterials(),details==null?null:details.labor(),BigDecimal.ZERO};
  for(int i=0;i<keys.length;i++){String key=keys[i];categories.add(new ExecutionResponse.Category(key,names[i],plans[i],s.expenses().stream().filter(e->e.category().equals(key)).map(Expense::amount).reduce(BigDecimal.ZERO,BigDecimal::add)));}
  LocalDate end=s.tasks().isEmpty()?null:s.tasks().getLast().endDate();int days=end==null?0:(int)ChronoUnit.DAYS.between(s.startDate(),end)+1;
  int progress=progress(s);
  return new ExecutionResponse(p.getProjectId(),record.getVersion(),s,latest!=null,latest!=null&&(b==null||!latest.id().equals(b.id())),b!=null&&b.timePlan()!=null,plan,reserve,spent,plan==null?null:plan.subtract(spent),reserve==null?null:reserve.subtract(spent),categories,progress,end,days);
 }
 private Project project(UUID id){var p=projects.findForUpdate(id).orElseThrow(()->new ResourceNotFoundException("Проект не найден"));if(p.getStatus()!=ProjectStatus.ACTIVE)throw new BusinessException("Сначала сохраните проект");return p;}
 private ProjectExecution prepare(Project p){return executions.findById(p.getProjectId()).orElseGet(()->executions.saveAndFlush(new ProjectExecution(p.getProjectId(),write(new ExecutionState(estimate(p),null,List.of(),List.of(),List.of())))) );}
 private RefinedEstimate estimate(Project p){return p.getEstimateDetailsJson()==null?null:read(p.getEstimateDetailsJson(),RefinedEstimate.class);}
 private static void date(LocalDate date){if(date==null||date.getYear()<2000||date.getYear()>2100)throw new BusinessException("Укажите дату между 2000 и 2100 годами");}
 private String write(Object o){try{return json.writeValueAsString(o);}catch(Exception e){throw new IllegalStateException("Cannot save execution",e);}}
 private <T>T read(String s,Class<T> t){try{return json.readValue(s,t);}catch(Exception e){throw new IllegalStateException("Cannot read execution",e);}}
}
