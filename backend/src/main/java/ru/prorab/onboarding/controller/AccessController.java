package ru.prorab.onboarding.controller;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import ru.prorab.onboarding.dto.*;
import ru.prorab.onboarding.service.AccessService;
import java.util.UUID;
@RestController @RequestMapping("/api/projects/access")
public class AccessController {
 private final AccessService service;
 public AccessController(AccessService service){this.service=service;}
 @GetMapping public AccessResponse get(@RequestAttribute("userId") UUID user){return service.get(user);}
 @PostMapping("/view") public AccessResponse view(@RequestAttribute("userId") UUID user){return service.viewed(user);}
 @PostMapping("/answers") public AccessResponse answers(@RequestAttribute("userId") UUID user,@Valid @RequestBody AnswersRequest r){return service.submit(user,r);}
 @PostMapping("/trial") public AccessResponse trial(@RequestAttribute("userId") UUID user){return service.startTrial(user);}
 @PostMapping("/offer") public AccessResponse offer(@RequestAttribute("userId") UUID user){return service.offerViewed(user);}
}
