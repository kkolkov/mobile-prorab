package ru.prorab.auth.service;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.*;
import java.util.*;
import org.springframework.stereotype.Component;
@Component
public class Passwords {
 private static final int ITERATIONS=600_000;
 private final SecureRandom random=new SecureRandom();
 public String hash(String password){byte[] salt=new byte[16];random.nextBytes(salt);
  return ITERATIONS+":"+Base64.getEncoder().encodeToString(salt)+":"+Base64.getEncoder().encodeToString(derive(password,salt,ITERATIONS));}
 public boolean matches(String password,String encoded){
  try{String[] parts=encoded.split(":");return MessageDigest.isEqual(Base64.getDecoder().decode(parts[2]),derive(password,Base64.getDecoder().decode(parts[1]),Integer.parseInt(parts[0])));}
  catch(IllegalArgumentException|IndexOutOfBoundsException e){return false;}
 }
 private byte[] derive(String password,byte[] salt,int iterations){
  PBEKeySpec spec=new PBEKeySpec(password.toCharArray(),salt,iterations,256);
  try{return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();}
  catch(GeneralSecurityException e){throw new IllegalStateException("Password hashing unavailable",e);}
  finally{spec.clearPassword();}
 }
}
