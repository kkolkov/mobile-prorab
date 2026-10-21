package ru.prorab.execution.controller;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import ru.prorab.execution.dto.*;
import ru.prorab.execution.service.ExecutionService;
import java.util.UUID;
@RestController @RequestMapping("/api/projects/{projectId}/execution")
public class ExecutionController {
 private final ExecutionService service;
 public ExecutionController(ExecutionService s){service=s;}
 @GetMapping public ExecutionResponse get(@PathVariable UUID projectId){return service.get(projectId);}
 @PostMapping("/{action}") public ExecutionResponse command(@PathVariable UUID projectId,@PathVariable String action,@Valid @RequestBody ExecutionCommand command){return service.command(projectId,action,command);}
}
