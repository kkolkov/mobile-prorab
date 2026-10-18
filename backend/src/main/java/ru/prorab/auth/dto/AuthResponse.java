package ru.prorab.auth.dto;
import java.time.Instant;
import java.util.UUID;
public record AuthResponse(UUID userId,String login,String token,Instant expiresAt) {}
