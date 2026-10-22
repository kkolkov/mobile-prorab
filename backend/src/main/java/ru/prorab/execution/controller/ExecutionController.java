package ru.prorab.execution.controller;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import ru.prorab.execution.dto.*;
import ru.prorab.execution.service.ExecutionService;
import java.util.UUID;
@RestController @RequestMapping("/api/projects/{projectId}/execution")
public class ExecutionController {
 private final ExecutionService service;
 private final ru.prorab.execution.service.StagePhotoService photos;
 public ExecutionController(ExecutionService s,ru.prorab.execution.service.StagePhotoService photos){service=s;this.photos=photos;}
 @GetMapping("/photos/{photoId}") public StagePhotoInput photo(@PathVariable UUID projectId,@PathVariable UUID photoId){return photos.get(projectId,photoId);}
 @GetMapping public ExecutionResponse get(@PathVariable UUID projectId){return service.get(projectId);}
 @PostMapping("/{action}") public ExecutionResponse command(@PathVariable UUID projectId,@PathVariable String action,@Valid @RequestBody ExecutionCommand command){return service.command(projectId,action,command);}
}
