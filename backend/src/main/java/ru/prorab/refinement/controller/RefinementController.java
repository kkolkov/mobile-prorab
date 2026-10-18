package ru.prorab.refinement.controller;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.*;
import ru.prorab.refinement.dto.*;
import ru.prorab.refinement.service.RefinementService;
import java.util.UUID;
@RestController
@RequestMapping("/api/projects/{projectId}/refinement")
public class RefinementController {
    private final RefinementService service;
    public RefinementController(RefinementService service){this.service=service;}
    @GetMapping public RefinementResponse get(@PathVariable UUID projectId){return service.get(projectId);}
    @PutMapping("/{section}") public RefinementResponse save(@PathVariable UUID projectId,@PathVariable String section,@Valid @RequestBody SaveSectionRequest request){return service.save(projectId,section,request);}
    public record VersionRequest(@NotNull Long version) {}
    public record ApplyRequest(@NotNull Long version,@NotNull UUID estimateId) {}
    @PostMapping("/calculate") public RefinementResponse calculate(@PathVariable UUID projectId,@Valid @RequestBody VersionRequest request){return service.retry(projectId,request.version());}
    @PostMapping("/apply") public RefinementResponse apply(@PathVariable UUID projectId,@Valid @RequestBody ApplyRequest request){return service.apply(projectId,request.version(),request.estimateId());}
}
