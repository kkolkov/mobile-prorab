package ru.prorab.auth.dto;
import jakarta.validation.constraints.*;
public record Credentials(
 @NotBlank(message="Введите логин") @Pattern(regexp="[a-zA-Z0-9._-]{3,40}",message="Логин: 3–40 символов, латиница, цифры, точка, дефис или подчёркивание") String login,
 @NotNull @Size(min=8,max=128,message="Пароль: от 8 до 128 символов") String password, Boolean privacyAccepted) {}
