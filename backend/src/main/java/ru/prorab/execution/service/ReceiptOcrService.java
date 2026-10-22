package ru.prorab.execution.service;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import ru.prorab.execution.dto.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.Semaphore;
@Service
public class ReceiptOcrService {
 private final OcrSpaceClient client;private final ReceiptParser parser;private final StagePhotoService photos;
 private final Semaphore slots=new Semaphore(2);
 private record Window(long start,int count){}
 private final Map<UUID,Window> users=new HashMap<>();private LocalDate day=LocalDate.now();private int daily;
 public ReceiptOcrService(OcrSpaceClient client,ReceiptParser parser,StagePhotoService photos){this.client=client;this.parser=parser;this.photos=photos;}
 public ReceiptSuggestion recognize(UUID userId,StagePhotoInput photo){
  client.requireConfigured();
  byte[] image=photos.receiptBytes(photo);
  if(image.length>1000000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Чек слишком большой для распознавания. Обрежьте лишний фон или выберите более компактное фото.");
  if(!slots.tryAcquire())throw limit();
  try{count(userId);return parser.parse(client.recognize(image));}finally{slots.release();}
 }
 private synchronized void count(UUID user){
  if(!LocalDate.now().equals(day)){day=LocalDate.now();daily=0;}
  long now=System.currentTimeMillis();users.entrySet().removeIf(e->now-e.getValue().start()>60000);
  var old=users.get(user);if(daily>=400||(old!=null&&old.count()>=5))throw limit();
  users.put(user,new Window(old==null?now:old.start(),old==null?1:old.count()+1));daily++;
 }
 private ResponseStatusException limit(){return new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Слишком много запросов распознавания. Попробуйте позже или заполните расход вручную.");}
}
