package ru.prorab.auth.controller;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import ru.prorab.auth.dto.*;
import ru.prorab.auth.service.AuthService;
import java.util.*;
@RestController @RequestMapping("/api/auth")
public class AuthController {
 private final AuthService service;
 public AuthController(AuthService service){this.service=service;}
 @PostMapping("/register") public AuthResponse register(@Valid @RequestBody Credentials r){return service.register(r);}
 @PostMapping("/login") public AuthResponse login(@Valid @RequestBody Credentials r){return service.login(r);}
 @GetMapping("/me") public AuthResponse me(@RequestAttribute UUID userId){return service.me(userId);}
 @PostMapping("/logout") public Map<String,Boolean> logout(@RequestAttribute String sessionHash){service.logout(sessionHash);return Map.of("ok",true);}
}
