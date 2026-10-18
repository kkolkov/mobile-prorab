package ru.prorab.auth.entity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="accounts")
public class Account {
 @Id public UUID userId;
 @Column(length=40,nullable=false,unique=true) public String login;
 @Column(length=255,nullable=false) public String passwordHash;
 @Column(nullable=false) public Instant createdAt;
}
