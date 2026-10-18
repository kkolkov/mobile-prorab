package ru.prorab.auth.entity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="auth_sessions")
public class AuthSession {
 @Id @Column(length=64) public String tokenHash;
 @Column(nullable=false) public UUID userId;
 @Column(nullable=false) public Instant expiresAt;
}
