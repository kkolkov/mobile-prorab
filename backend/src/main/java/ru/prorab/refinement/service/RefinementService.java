package ru.prorab.refinement.service;
import ru.prorab.refinement.model.AreaAllocation;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.prorab.common.exception.*;
import ru.prorab.project.entity.Project;
import ru.prorab.project.model.*;
import ru.prorab.project.repository.ProjectRepository;
import ru.prorab.project.service.ProjectMapper;
import ru.prorab.refinement.dto.*;
import ru.prorab.refinement.entity.ProjectRefinement;
import ru.prorab.refinement.model.RefinementData;
import ru.prorab.refinement.model.RefinementData.*;
import ru.prorab.refinement.repository.RefinementRepository;
import java.math.*;
import java.time.Instant;
import java.util.*;

@Service
public class RefinementService {
    private final ProjectRepository projects;
    private final RefinementRepository refinements;
    private final ObjectMapper json;
    private final ProjectMapper mapper;
    private final RefinementValidation validation;
    private final AreaAllocator allocator;
    private final ApplicationEventPublisher events;
    public record Calculation(UUID projectId,UUID id,long revision,RefinementData input,AreaAllocation allocation) {}
    public RefinementService(ProjectRepository projects,RefinementRepository refinements,ObjectMapper json,
                             ProjectMapper mapper,RefinementValidation validation,AreaAllocator allocator,ApplicationEventPublisher events){
        this.projects=projects;this.refinements=refinements;this.json=json;this.mapper=mapper;this.validation=validation;this.allocator=allocator;this.events=events;
    }
    public static int recommended(BigDecimal area){return Math.min(12,Math.max(1,area.add(new BigDecimal("15")).divideToIntegralValue(new BigDecimal("30")).intValue()));}
    @Transactional
    public RefinementResponse get(UUID id){Project p=project(id);return response(p,prepare(p));}
    @Transactional
    public RefinementResponse save(UUID id,String section,SaveSectionRequest request){
        Project p=project(id);checkVersion(p,request.version());ProjectRefinement record=prepare(p);RefinementData old=read(record.getInputJson(),RefinementData.class);
        Apartment apartment=old.apartment();List<Room> rooms=new ArrayList<>(old.rooms());boolean manual=old.roomCountManual();
        Map<UUID,Kitchen> kitchens=new LinkedHashMap<>(old.kitchens());Exteriors exteriors=old.exteriors();
        switch(section){
            case "apartment"->{
                apartment=convert(request.data(),Apartment.class);
                if(apartment==null)throw new BusinessException("Не указаны параметры квартиры");
                if(apartment.areaM2()!=null&&!manual&&rooms.stream().filter(r->r.type().equals("living")).allMatch(this::emptyAutomatic)){
                    resize(rooms,recommended(apartment.areaM2()));
                }
            }
            case "rooms"->{
                RoomsInput input=convert(request.data(),RoomsInput.class);
                if(input==null||input.rooms()==null)throw new BusinessException("Не переданы помещения");
                Map<UUID,Room> prior=new HashMap<>();old.rooms().forEach(r->prior.put(r.id(),r));
                rooms=new ArrayList<>();
                for(Room r:input.rooms()){
                    if(r==null||r.id()==null||r.type()==null)throw new BusinessException("Укажите идентификатор и тип помещения");
                    Room before=prior.get(r.id());boolean automatic=before!=null&&before.automatic()&&sameRoom(before,r);
                    rooms.add(new Room(r.id(),r.type(),r.name(),r.areaM2(),r.floor(),r.walls(),r.ceiling(),automatic));
                }
                Set<UUID> currentLiving=new HashSet<>();rooms.stream().filter(r->r.type().equals("living")).forEach(r->currentLiving.add(r.id()));
                Set<UUID> oldLiving=new HashSet<>();old.rooms().stream().filter(r->r.type().equals("living")).forEach(r->oldLiving.add(r.id()));
                manual=manual||input.roomCountManual()||!currentLiving.equals(oldLiving);
                Set<UUID> confirmed=request.confirmedRemovals()==null?Set.of():request.confirmedRemovals();
                for(Room before:old.rooms()){
                    boolean removed=rooms.stream().noneMatch(r->r.id().equals(before.id())&&r.type().equals(before.type()));
                    boolean equipped=before.type().equals("kitchen")&&!Objects.equals(kitchens.get(before.id()),Kitchen.defaults());
                    if(removed&&(!emptyAutomatic(before)||equipped)&&!confirmed.contains(before.id()))throw new BusinessException("Подтвердите удаление заполненного помещения и его оснащения");
                }
                Set<UUID> kitchenIds=new HashSet<>();rooms.stream().filter(r->r.type().equals("kitchen")).forEach(r->kitchenIds.add(r.id()));
                kitchens.keySet().retainAll(kitchenIds);kitchenIds.forEach(k->kitchens.putIfAbsent(k,Kitchen.defaults()));
            }
            case "kitchen"->{
                JsonNode node=request.data();if(!node.isObject())throw new BusinessException("Неверные данные кухонь");
                Map<UUID,Kitchen> submitted=new LinkedHashMap<>();node.fields().forEachRemaining(e->submitted.put(UUID.fromString(e.getKey()),convert(e.getValue(),Kitchen.class)));
                if(!submitted.keySet().equals(kitchens.keySet()))throw new BusinessException("Состав кухонь изменился. Обновите форму");
                kitchens.clear();kitchens.putAll(submitted);
            }
            case "exteriors"->exteriors=convert(request.data(),Exteriors.class);
            default->throw new BusinessException("Неизвестный раздел");
        }
        RefinementData changed=new RefinementData(apartment,List.copyOf(rooms),manual,Map.copyOf(kitchens),exteriors,old.completedSections());
        validation.validate(changed);
        AreaAllocation allocation=allocator.allocate(id,apartment.areaM2(),rooms);
        if(allocation.excessBlocked())throw new BusinessException("Сумма площадей превышает площадь квартиры сверх допуска max(0,5 м²; 1%)");
        if(json.valueToTree(old).equals(json.valueToTree(changed))
                && !(section.equals("exteriors")&&!old.completedSections().contains(section)))return response(p,record);
        Set<String> sections=new HashSet<>(old.completedSections());sections.add(section);
        changed=new RefinementData(apartment,List.copyOf(rooms),manual,Map.copyOf(kitchens),exteriors,Set.copyOf(sections));
        boolean calculationChanged=!calculationInput(old).equals(calculationInput(changed));
        record.setInputJson(write(changed));
        updateProject(p,changed);
        if(calculationChanged){record.incrementRevision();if(p.getEstimateStatus()==EstimateStatus.READY)p.setEstimateStatus(EstimateStatus.STALE);}
        p.setUpdatedAt(Instant.now());projects.saveAndFlush(p);
        record.setCalculationProjectVersion(p.getVersion());
        if(calculationChanged)requestCalculation(p,record,changed,allocation);
        refinements.saveAndFlush(record);
        return response(p,record);
    }
    @Transactional
    public RefinementResponse retry(UUID id,long version){
        Project p=project(id);checkVersion(p,version);ProjectRefinement r=prepare(p);
        if(r.getCalculationStatus().equals("pending"))return response(p,r);
        RefinementData d=read(r.getInputJson(),RefinementData.class);
        r.setCalculationProjectVersion(p.getVersion());requestCalculation(p,r,d,allocator.allocate(id,p.getAreaM2(),d.rooms()));
        refinements.saveAndFlush(r);return response(p,r);
    }
    @Transactional
    public void resumePending() {
        for(ProjectRefinement record:refinements.findByCalculationStatus("pending")) {
            Project p=project(record.getProjectId());
            if(p.getVersion()!=record.getCalculationProjectVersion()){record.setCalculationStatus("stale");continue;}
            RefinementData d=read(record.getInputJson(),RefinementData.class);
            events.publishEvent(new Calculation(p.getProjectId(),record.getCalculationId(),record.getRevision(),d,
                    allocator.allocate(p.getProjectId(),d.apartment().areaM2(),d.rooms())));
        }
    }
    @Transactional
    public void complete(Calculation job,RefinedEstimate result){
        Project p=project(job.projectId());ProjectRefinement r=refinements.findById(job.projectId()).orElseThrow();
        if(!r.getCalculationStatus().equals("pending")||!Objects.equals(r.getCalculationId(),job.id())||r.getRevision()!=job.revision())return;
        if(p.getVersion()!=r.getCalculationProjectVersion()){r.setCalculationStatus("stale");return;}
        r.setCandidateJson(result==null?null:write(result));r.setCalculationStatus(result==null?"failed":"ready");
    }
    @Transactional
    public RefinementResponse apply(UUID id,long version,UUID estimateId){
        Project p=project(id);ProjectRefinement r=prepare(p);
        RefinedEstimate active=readNullable(r.getActiveEstimateJson());
        if(active!=null&&active.id().equals(estimateId))return response(p,r); // retry after response loss
        checkVersion(p,version);RefinedEstimate candidate=readNullable(r.getCandidateJson());
        if(candidate==null||!candidate.id().equals(estimateId)||candidate.revision()!=r.getRevision()||!r.getCalculationStatus().equals("ready")||r.getCalculationProjectVersion()!=p.getVersion())throw new BusinessException("Применить можно только актуальный полный расчёт");
        r.setActiveEstimateJson(write(candidate));
        p.setEstimateDetailsJson(write(candidate));
        p.setBudgetMinRub(candidate.total().min().intValueExact());p.setBudgetMaxRub(candidate.total().max().intValueExact());
        // No duration change: demo calculator does not implement a supported duration algorithm.
        p.setEstimateStatus(EstimateStatus.READY);p.setStatus(ProjectStatus.ACTIVE);p.setUpdatedAt(Instant.now());projects.saveAndFlush(p);
        r.setCalculationProjectVersion(p.getVersion());refinements.saveAndFlush(r);
        return response(p,r);
    }
    private void requestCalculation(Project p,ProjectRefinement r,RefinementData d,AreaAllocation allocation){
        r.setCandidateJson(null);r.setCalculationId(UUID.randomUUID());
        if(!allocation.complete()){r.setCalculationStatus("incomplete");return;}
        r.setCalculationStatus("pending");
        events.publishEvent(new Calculation(p.getProjectId(),r.getCalculationId(),r.getRevision(),d,allocation));
    }
    private ProjectRefinement prepare(Project p){
        var existing=refinements.findById(p.getProjectId());if(existing.isPresent())return existing.get();
        if(p.getCompletedStep()<5)throw new BusinessException("Сначала завершите создание проекта");
        RefinementData d=new InitialRefinementData().from(p);
        ProjectRefinement r=new ProjectRefinement(p.getProjectId(),write(d));r.setCalculationProjectVersion(p.getVersion());
        if(p.getEstimateDetailsJson()!=null){
            r.setActiveEstimateJson(p.getEstimateDetailsJson());
        }else if(p.getBudgetMinRub()!=null&&p.getBudgetMaxRub()!=null){
            BigDecimal min=BigDecimal.valueOf(p.getBudgetMinRub()),max=BigDecimal.valueOf(p.getBudgetMaxRub());BigDecimal expected=min.add(max).divide(new BigDecimal("2"),0,RoundingMode.HALF_UP);
            var totals=new RefinedEstimate.Totals(min,max,expected,expected.multiply(new BigDecimal("1.1")).setScale(0,RoundingMode.HALF_UP));
            r.setActiveEstimateJson(write(new RefinedEstimate(UUID.randomUUID(),-1,true,"legacy-demo","legacy-demo","legacy-demo",null,null,totals,null,null,p.getDurationMinDays(),p.getDurationMaxDays(),List.of(),List.of("Исходная оценка — заглушка; ожидаемая сумма взята как середина диапазона, резерв 10%. Разбивка исходной оценки отсутствует."),null)));
        }
        return refinements.saveAndFlush(r);
    }
    private RefinementResponse response(Project p,ProjectRefinement r){
        RefinementData d=read(r.getInputJson(),RefinementData.class);var active=readNullable(r.getActiveEstimateJson());
        String status=r.getCalculationStatus();if(r.getCalculationProjectVersion()!=p.getVersion())status="stale";
        var allocation=allocator.allocate(p.getProjectId(),d.apartment().areaM2(),d.rooms());
        String message=switch(status){case "pending"->"Пересчитываем проект…";case "ready"->"Расчёт по справочнику готов";case "failed"->"Не удалось рассчитать. Сохранённые данные доступны";case "incomplete"->"Проверьте площади и состав помещений";case "stale"->"Параметры изменились. Обновите расчёт";default->"Сохраните уточнения, чтобы получить расчёт по справочнику";};
        return new RefinementResponse(mapper.toResponse(p),d,r.getRevision(),recommended(p.getAreaM2()),allocation,status,message,
                p.getEstimateStatus()==EstimateStatus.STALE,Set.of("laminate","vinyl","parquet","tile","wallpaper","paint","plaster","stretch","drywall"),active,
                status.equals("ready")?readNullable(r.getCandidateJson()):null);
    }
    private void updateProject(Project p,RefinementData d){
        Apartment a=d.apartment();p.setAreaM2(a.areaM2());p.setCurrentState(a.currentState());p.setTargetState(a.targetState());p.setFinishLevel(a.finishLevel());
        p.setRoomsCount((int)d.rooms().stream().filter(r->r.type().equals("living")).count());
        p.setKitchensCount((int)d.rooms().stream().filter(r->r.type().equals("kitchen")).count());
        p.setBathroomsCount((int)d.rooms().stream().filter(r->Set.of("combined_bathroom","bathroom","toilet").contains(r.type())).count());
        String area=a.areaM2().stripTrailingZeros().toPlainString();
        if(p.getNameSource()==NameSource.AUTO)p.setName("Ремонт квартиры "+area+" м²");
        else p.setName(java.util.regex.Pattern.compile("(^|\\s)\\d+(?:[.,]\\d+)?(\\s*м²\\s*)$").matcher(p.getName()).replaceAll(m->m.group(1)+area+m.group(2)));
    }
    private boolean sameRoom(Room a,Room b){return Objects.equals(a.type(),b.type())&&Objects.equals(a.name(),b.name())&&Objects.equals(a.areaM2(),b.areaM2())&&Objects.equals(a.floor(),b.floor())&&Objects.equals(a.walls(),b.walls())&&Objects.equals(a.ceiling(),b.ceiling());}
    private boolean emptyAutomatic(Room r){return r.automatic()&&r.areaM2()==null&&"inherit".equals(r.floor())&&"inherit".equals(r.walls())&&"inherit".equals(r.ceiling());}
    private void resize(List<Room> rooms,int count){
        int current=(int)rooms.stream().filter(r->r.type().equals("living")).count();
        while(current<count){rooms.add(room("living","Комната "+(++current)));}
        for(int i=rooms.size()-1;i>=0&&current>count;i--)if(rooms.get(i).type().equals("living")&&emptyAutomatic(rooms.get(i))){rooms.remove(i);current--;}
    }
    private Room room(String type,String name){return new Room(UUID.randomUUID(),type,name,null,"inherit","inherit","inherit",true);}
    private JsonNode calculationInput(RefinementData d){ObjectNode tree=json.valueToTree(d);tree.remove(List.of("completedSections","roomCountManual"));((ArrayNode)tree.get("rooms")).forEach(r->((ObjectNode)r).remove(List.of("name","automatic")));return tree;}
    private Project project(UUID id){return projects.findForUpdate(id).orElseThrow(()->new ResourceNotFoundException("Проект не найден"));}
    private void checkVersion(Project p,Long version){if(version==null||p.getVersion()!=version)throw new ObjectOptimisticLockingFailureException(Project.class,p.getProjectId());}
    private String write(Object value){try{return json.writeValueAsString(value);}catch(JsonProcessingException ex){throw new IllegalStateException("Cannot serialize refinement",ex);}}
    private <T>T read(String value,Class<T> type){try{return json.readValue(value,type);}catch(JsonProcessingException ex){throw new IllegalStateException("Invalid stored refinement",ex);}}
    private <T>T convert(JsonNode value,Class<T> type){try{return json.treeToValue(value,type);}catch(JsonProcessingException|IllegalArgumentException ex){throw new BusinessException("Некорректные данные раздела");}}
    private RefinedEstimate readNullable(String value){return value==null?null:read(value,RefinedEstimate.class);}
}
