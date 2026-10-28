package ru.prorab.auth.dto;
import jakarta.validation.constraints.*;
public record PasswordChange(@NotBlank @Size(min=8,max=128,message="Пароль: от 8 до 128 символов") String newPassword) {}
