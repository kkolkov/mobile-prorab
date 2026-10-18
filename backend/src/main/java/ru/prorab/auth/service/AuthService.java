package ru.prorab.auth.service;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import ru.prorab.auth.entity.*;
import ru.prorab.auth.repository.*;
import ru.prorab.auth.dto.*;
import java.time.*;
import java.util.*;
import java.security.*;
import java.nio.charset.StandardCharsets;
@Service
public class AuthService {
 private final AccountRepository accounts;private final SessionRepository sessions;private final Passwords passwords;
 private final SecureRandom random=new SecureRandom();private final String dummyHash;
 public AuthService(AccountRepository accounts,SessionRepository sessions,Passwords passwords){this.accounts=accounts;this.sessions=sessions;this.passwords=passwords;dummyHash=passwords.hash(UUID.randomUUID().toString());}
 @Transactional public AuthResponse register(Credentials input){
  String login=input.login().toLowerCase(Locale.ROOT);
  if(accounts.findByLogin(login).isPresent())throw new ResponseStatusException(HttpStatus.CONFLICT,"Этот логин уже занят");
  Account a=new Account();a.userId=UUID.randomUUID();a.login=login;a.passwordHash=passwords.hash(input.password());a.createdAt=Instant.now();
  try{accounts.saveAndFlush(a);}catch(org.springframework.dao.DataIntegrityViolationException e){throw new ResponseStatusException(HttpStatus.CONFLICT,"Этот логин уже занят");}
  return session(a);
 }
 @Transactional public AuthResponse login(Credentials input){
  Account a=accounts.findByLogin(input.login().toLowerCase(Locale.ROOT)).orElse(null);
  boolean valid=passwords.matches(input.password(),a==null?dummyHash:a.passwordHash);
  if(a==null||!valid)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Неверный логин или пароль");
  return session(a);
 }
 private AuthResponse session(Account a){
  byte[] bytes=new byte[32];random.nextBytes(bytes);String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  AuthSession s=new AuthSession();s.tokenHash=digest(token);s.userId=a.userId;s.expiresAt=Instant.now().plus(Duration.ofDays(30));sessions.save(s);
  return new AuthResponse(a.userId,a.login,token,s.expiresAt);
 }
 @Transactional(readOnly=true) public AuthSession authenticate(String header){
  if(header==null||!header.startsWith("Bearer ")||header.length()>100)throw unauthorized();
  AuthSession s=sessions.findById(digest(header.substring(7))).orElseThrow(AuthService::unauthorized);
  if(!s.expiresAt.isAfter(Instant.now()))throw unauthorized();return s;
 }
 @Transactional(readOnly=true) public AuthResponse me(UUID user){Account a=accounts.findById(user).orElseThrow(AuthService::unauthorized);return new AuthResponse(a.userId,a.login,null,null);}
 @Transactional public void logout(String hash){sessions.deleteById(hash);}
 private static ResponseStatusException unauthorized(){return new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Войдите в аккаунт");}
 private static String digest(String token){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
}
