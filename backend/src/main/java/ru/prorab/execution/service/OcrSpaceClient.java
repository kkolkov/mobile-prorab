package ru.prorab.execution.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
@Component
public class OcrSpaceClient {
 private final String key;private final URI endpoint;private final ObjectMapper json;
 private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
 public OcrSpaceClient(@Value("${OCR_SPACE_API_KEY:}") String key,@Value("${prorab.ocr.endpoint:https://api.ocr.space/parse/image}") String endpoint,ObjectMapper json){this.key=key;this.endpoint=URI.create(endpoint);this.json=json;}
 public void requireConfigured(){if(key.isBlank())throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Распознавание чеков пока не настроено. Можно прикрепить чек и заполнить расход вручную.");}
 public String recognize(byte[] image){
  requireConfigured();
  String data="data:image/jpeg;base64,"+Base64.getEncoder().encodeToString(image);
  String body="OCREngine=2&language=auto&isTable=true&detectOrientation=true&isOverlayRequired=false&base64Image="+URLEncoder.encode(data,StandardCharsets.UTF_8);
  try{
   var req=HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(10)).header("apikey",key).header("Content-Type","application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString(body)).build();
   var response=http.send(req,HttpResponse.BodyHandlers.ofString());
   if(response.statusCode()==429)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Лимит распознавания исчерпан. Попробуйте позже или заполните расход вручную.");
   if(response.statusCode()!=200||response.body().length()>500000)throw unavailable();
   var result=json.readTree(response.body());
   if(result.path("IsErroredOnProcessing").asBoolean()||result.path("OCRExitCode").asInt()!=1)throw unavailable();
   var pages=result.path("ParsedResults");if(!pages.isArray()||pages.size()!=1||pages.get(0).path("FileParseExitCode").asInt()!=1)throw unavailable();
   String text=pages.get(0).path("ParsedText").asText("");
   if(text.isBlank())throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,"Текст чека не найден. Сфотографируйте ближе и без бликов или заполните расход вручную.");
   return text;
  }catch(ResponseStatusException e){throw e;}catch(InterruptedException e){Thread.currentThread().interrupt();throw unavailable();}catch(Exception e){throw unavailable();}
 }
 private ResponseStatusException unavailable(){return new ResponseStatusException(HttpStatus.BAD_GATEWAY,"Сервис распознавания не ответил или не смог прочитать чек. Повторите позже или заполните расход вручную.");}
}
