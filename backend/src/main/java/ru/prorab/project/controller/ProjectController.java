package ru.prorab.project.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import ru.prorab.project.dto.*;
import ru.prorab.project.service.ProjectService;

import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService projectService;
    private final ru.prorab.onboarding.service.AccessService access;
    public ProjectController(ProjectService projectService, ru.prorab.onboarding.service.AccessService access) { this.projectService = projectService; this.access = access; }

    @GetMapping
    public java.util.List<ProjectListResponse> list(@RequestAttribute UUID userId) { return projectService.list(userId); }

    @PostMapping("/draft")
    public ProjectResponse createDraft(@Valid @RequestBody CreateDraftRequest request, @RequestAttribute(value="userId", required=false) UUID user) {
        try { return projectService.createDraft(request, user); }
        catch (RuntimeException error) {
            if (user != null) {
                try { access.assignmentFailed(user); }
                catch (RuntimeException unavailable) {
                    org.slf4j.LoggerFactory.getLogger(ProjectController.class).warn("Could not persist onboarding failure event");
                }
            }
            throw error;
        }
    }

    @PutMapping("/{projectId}/name")
    public ProjectResponse rename(@PathVariable UUID projectId, @Valid @RequestBody RenameProjectRequest request) {
        return projectService.rename(projectId, request);
    }

    @PostMapping("/{projectId}/delete")
    public void delete(@PathVariable UUID projectId, @RequestParam long version) {
        projectService.delete(projectId, version);
    }

    @GetMapping("/{projectId}")
    public ProjectResponse get(@PathVariable UUID projectId) { return projectService.get(projectId); }

    @PutMapping("/{projectId}/steps/{step}")
    public ProjectResponse saveStep(@PathVariable UUID projectId, @PathVariable int step, @RequestBody StepRequest request) {
        return projectService.saveStep(projectId, step, request);
    }

    @PutMapping("/{projectId}/steps/5/estimate")
    public ProjectResponse saveStepAndEstimate(@PathVariable UUID projectId, @RequestBody StepRequest request) {
        return projectService.saveStepAndEstimate(projectId, request);
    }

    @PostMapping("/{projectId}/estimate")
    public ProjectResponse estimate(@PathVariable UUID projectId, @RequestParam(required = false) Long version) {
        return projectService.estimate(projectId, version);
    }

    @PostMapping("/{projectId}/activate")
    public ProjectResponse activate(@PathVariable UUID projectId, @RequestParam(required = false) Long version) {
        return projectService.activate(projectId, version);
    }
}
