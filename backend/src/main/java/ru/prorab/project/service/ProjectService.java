package ru.prorab.project.service;

import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.prorab.common.exception.BusinessException;
import ru.prorab.common.exception.ResourceNotFoundException;
import ru.prorab.estimate.dto.EstimateResult;
import ru.prorab.estimate.service.EstimateService;
import ru.prorab.project.dto.*;
import ru.prorab.project.entity.Project;
import ru.prorab.project.model.*;
import ru.prorab.project.repository.ProjectRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
public class ProjectService {
    private final ProjectRepository repository;
    private final ProjectMapper mapper;
    private final ru.prorab.execution.service.ExecutionService executions;
    private final EstimateService estimateService;
    private final ru.prorab.pricing.service.EstimateSnapshots estimateSnapshots;
    private final ru.prorab.refinement.repository.RefinementRepository refinements;

    public ProjectService(ProjectRepository repository, ProjectMapper mapper, EstimateService estimateService, ru.prorab.refinement.repository.RefinementRepository refinements, ru.prorab.onboarding.service.AccessService access, ru.prorab.pricing.service.EstimateSnapshots estimateSnapshots, ru.prorab.execution.service.ExecutionService executions) {
        this.executions=executions;
        this.estimateSnapshots=estimateSnapshots;
        this.repository = repository; this.mapper = mapper; this.estimateService = estimateService; this.refinements = refinements; this.access = access;
    }

    private final ru.prorab.onboarding.service.AccessService access;

    @Transactional
    public ProjectResponse createDraft(CreateDraftRequest request) { return createDraft(request, null); }

    @Transactional
    public ProjectResponse createDraft(CreateDraftRequest request, UUID userId) {
        boolean userName = request.name() != null && !request.name().isBlank();
        Project project = Project.draft(request.areaM2(), request.address(),
                userName ? request.name().trim() : autoName(request.areaM2()));
        if (userName) project.setNameSource(NameSource.USER);
        project.setOwnerId(userId);
        project.setQuestionnaire(request.questionnaire());
        repository.saveAndFlush(project);
        if (userId != null) {
            access.assign(userId, project.getProjectId());
            if(request.questionnaire()!=null && access.get(userId).questionnaireRequired())
                access.submit(userId,request.questionnaire());
        }
        return mapper.toResponse(project);
    }

    @Transactional
    public ProjectResponse rename(UUID id, RenameProjectRequest request) {
        Project project=find(id);
        checkVersion(project,request.version());
        project.setName(request.name().trim());
        project.setNameSource(NameSource.USER);
        touch(project);
        return mapper.toResponse(repository.saveAndFlush(project));
    }

    @Transactional
    public void delete(UUID id, long version) {
        Project p=repository.findForUpdate(id).orElseThrow(()->new ResourceNotFoundException("Проект не найден"));
        checkVersion(p,version);
        repository.delete(p);
        repository.flush();
    }

    @Transactional(readOnly = true)
    public java.util.List<ProjectListResponse> list(UUID userId) {
        var projects=repository.findByOwnerIdOrderByUpdatedAtDesc(userId);
        var progress=executions.progressFor(projects.stream().filter(p->p.getStatus()!=ProjectStatus.DRAFT).map(Project::getProjectId).toList());
        return projects.stream().map(p->new ProjectListResponse(mapper.toResponse(p),progress.get(p.getProjectId()))).toList();
    }

    @Transactional(readOnly = true)
    public ProjectResponse get(UUID id) { return mapper.toResponse(find(id)); }

    @Transactional
    public ProjectResponse saveStep(UUID id, int step, StepRequest request) {
        requireWizard(id);
        if (step < 1 || step > 5) throw new BusinessException("Step must be between 1 and 5");
        Project p = find(id); checkVersion(p, request.version());
        if (step == 1) {
            if (request.version() == null) throw new BusinessException("Укажите версию проекта");
            BigDecimal area = required(request.areaM2(), "areaM2");
            if (area.compareTo(new BigDecimal("5")) < 0 || area.compareTo(new BigDecimal("9999")) > 0 || area.stripTrailingZeros().scale() > 1)
                throw new BusinessException("Проверьте введённую площадь");
            if (request.name() != null && request.name().length() > 100) throw new BusinessException("Название: не более 100 символов");
            if (request.address() != null && request.address().length() > 250) throw new BusinessException("Адрес: не более 250 символов");
        }
        applyCommon(p, request);
        switch (step) {
            case 1 -> { /* Returning to CP-01 updates the existing draft without completing CP-02. */ }
            case 2 -> p.setCurrentState(required(request.currentState(), "currentState"));
            case 3 -> p.setTargetState(required(request.targetState(), "targetState"));
            case 4 -> applyApartmentParams(p, request);
            case 5 -> p.setFinishLevel(required(request.finishLevel(), "finishLevel"));
            default -> throw new IllegalStateException();
        }
        p.setCompletedStep(Math.max(p.getCompletedStep(), step));
        invalidateEstimateIfNeeded(p, step);
        touch(p);
        return mapper.toResponse(repository.saveAndFlush(p));
    }

    @Transactional
    public ProjectResponse saveStepAndEstimate(UUID id, StepRequest request) {
        requireWizard(id);
        Project p = find(id); checkVersion(p, request.version());
        applyCommon(p, request); applyApartmentParamsIfPresent(p, request);
        p.setFinishLevel(required(request.finishLevel(), "finishLevel"));
        if (p.getCurrentState() == null || p.getTargetState() == null || p.getKitchensCount() == null || p.getBathroomsCount() == null) {
            throw new BusinessException("Previous steps are incomplete");
        }
        p.setCompletedStep(Math.max(p.getCompletedStep(), 5));
        p.setEstimateStatus(EstimateStatus.PENDING); touch(p); repository.saveAndFlush(p);
        calculate(p);
        return mapper.toResponse(repository.saveAndFlush(p));
    }

    @Transactional
    public ProjectResponse estimate(UUID id, Long version) {
        requireWizard(id);
        Project p = find(id); checkVersion(p, version);
        if (p.getFinishLevel() == null) throw new BusinessException("finishLevel is required");
        p.setEstimateStatus(EstimateStatus.PENDING); touch(p); repository.saveAndFlush(p);
        calculate(p);
        return mapper.toResponse(repository.saveAndFlush(p));
    }

    @Transactional
    public ProjectResponse activate(UUID id, Long version) {
        Project p = find(id);
        if(p.getStatus()==ProjectStatus.ACTIVE) return mapper.toResponse(p);
        checkVersion(p, version);
        if (p.getCompletedStep() < 5) throw new BusinessException("Завершите создание проекта перед переходом в проект");
        p.setStatus(ProjectStatus.ACTIVE); touch(p);
        return mapper.toResponse(repository.saveAndFlush(p));
    }

    private void requireWizard(UUID id) {
        repository.findForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        if(refinements.existsById(id)) throw new BusinessException("Для этого проекта используйте уточнение параметров и применение сметы");
    }
    private void calculate(Project p) {
        try {
            EstimateResult e = estimateService.calculate(p);
            p.setEstimateDetailsJson(estimateSnapshots.write(e.details()));
            p.setBudgetMinRub(e.budgetMinRub()); p.setBudgetMaxRub(e.budgetMaxRub());
            p.setDurationMinDays(e.durationMinDays()); p.setDurationMaxDays(e.durationMaxDays());
            p.setEstimateStatus(EstimateStatus.READY);
        } catch (RuntimeException ex) {
            p.setEstimateStatus(EstimateStatus.FAILED);
        }
        touch(p);
    }

    private void applyCommon(Project p, StepRequest r) {
        if (r.areaM2() != null) { if (r.areaM2().compareTo(new BigDecimal("5")) < 0 || r.areaM2().compareTo(new BigDecimal("9999")) > 0 || r.areaM2().stripTrailingZeros().scale()>1) throw new BusinessException("areaM2 must be positive"); p.setAreaM2(r.areaM2()); }
        if (r.address() != null) p.setAddress(r.address());
        if (r.name() != null) {
            boolean user = !r.name().isBlank(); p.setName(user ? r.name().trim() : autoName(p.getAreaM2())); p.setNameSource(user ? NameSource.USER : NameSource.AUTO);
        } else if (r.areaM2() != null) {
            if (p.getNameSource() == NameSource.AUTO) {
                p.setName(autoName(p.getAreaM2()));
            } else {
                p.setName(java.util.regex.Pattern.compile("(^|\\s)\\d+(?:[.,]\\d+)?(\\s*м²\\s*)$")
                        .matcher(p.getName()).replaceAll(match -> match.group(1)
                                + p.getAreaM2().stripTrailingZeros().toPlainString() + match.group(2)));
            }
        }
    }
    private void applyApartmentParamsIfPresent(Project p, StepRequest r) {
        if (r.roomsCount() != null || r.kitchensCount() != null || r.bathroomsCount() != null || r.redevelopment() != null) applyApartmentParams(p, r);
    }
    private void applyApartmentParams(Project p, StepRequest r) {
        if(r.roomsCount()!=null)p.setRoomsCount(validCount(r.roomsCount()));
        else if(r.kitchensCount()==null)throw new BusinessException("Укажите количество комнат");
        if(r.kitchensCount()!=null)p.setKitchensCount(validCount(r.kitchensCount()));
        p.setBathroomsCount(validCount(r.bathroomsCount()));
        p.setRedevelopment(Boolean.TRUE.equals(r.redevelopment()));
        p.setOtherRoomsRepair(Boolean.TRUE.equals(r.otherRoomsRepair()));
        if(Integer.valueOf(0).equals(p.getRoomsCount()) && p.getBathroomsCount()==0 && !p.isOtherRoomsRepair())
            throw new BusinessException("Подтвердите ремонт в других помещениях");
    }
    private void invalidateEstimateIfNeeded(Project p, int step) { if (step <= 5 && p.getEstimateStatus() == EstimateStatus.READY) p.setEstimateStatus(EstimateStatus.STALE); }
    private Project find(UUID id) { return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Project not found: " + id)); }
    private void checkVersion(Project p, Long version) { if (version != null && p.getVersion() != version) throw new ObjectOptimisticLockingFailureException(Project.class, p.getProjectId()); }
    private static int validCount(Integer v) { if (v == null || v < 0 || v > 20) throw new BusinessException("Количество: от 0 до 20"); return v; }
    private static <T> T required(T v, String n) { if (v == null) throw new BusinessException(n + " is required"); return v; }
    private static String autoName(BigDecimal area) { return "Ремонт квартиры " + area.stripTrailingZeros().toPlainString() + " м²"; }
    private static void touch(Project p) { p.setUpdatedAt(Instant.now()); }
}
