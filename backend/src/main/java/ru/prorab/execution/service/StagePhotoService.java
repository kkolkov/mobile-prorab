package ru.prorab.execution.service;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.prorab.execution.dto.StagePhotoInput;
import ru.prorab.execution.entity.StagePhoto;
import ru.prorab.execution.repository.StagePhotoRepository;
import ru.prorab.common.exception.*;
import java.util.*;
import java.io.*;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
@Service
public class StagePhotoService {
 private final StagePhotoRepository photos;
 public StagePhotoService(StagePhotoRepository photos){this.photos=photos;}
 @Transactional public List<UUID> save(UUID projectId,List<StagePhotoInput> inputs){
  if(inputs==null)return List.of();
  if(inputs.size()>5)throw new BusinessException("К этапу можно прикрепить до 5 фотографий");
  var ids=new ArrayList<UUID>();
  for(var input:inputs){var bytes=normalize(input);var id=UUID.randomUUID();photos.save(new StagePhoto(id,projectId,bytes));ids.add(id);}
  return List.copyOf(ids);
 }
 @Transactional(readOnly=true) public StagePhotoInput get(UUID projectId,UUID id){
  var photo=photos.findByIdAndProjectId(id,projectId).orElseThrow(()->new ResourceNotFoundException("Фотография не найдена"));
  return new StagePhotoInput("data:image/jpeg;base64,"+Base64.getEncoder().encodeToString(photo.getImage()));
 }
 public byte[] receiptBytes(StagePhotoInput input){return normalize(input,3200);}
 @Transactional public UUID saveReceipt(UUID projectId,StagePhotoInput input){var id=UUID.randomUUID();photos.save(new StagePhoto(id,projectId,receiptBytes(input)));return id;}
 @Transactional(readOnly=true) public boolean sameReceipt(UUID projectId,UUID id,StagePhotoInput input){
  if(id==null)return input==null;if(input==null)return false;
  return photos.findByIdAndProjectId(id,projectId).map(p->Arrays.equals(p.getImage(),receiptBytes(input))).orElse(false);
 }
 @Transactional public void deleteReceipt(UUID projectId,UUID id){if(id!=null)photos.findByIdAndProjectId(id,projectId).ifPresent(photos::delete);}
 private byte[] normalize(StagePhotoInput input){return normalize(input,1600);}
 private byte[] normalize(StagePhotoInput input,int maxSide){
  try{
   String value=input==null?null:input.dataUrl();
   if(value==null||value.length()>2800000||!(value.startsWith("data:image/jpeg;base64,")||value.startsWith("data:image/png;base64,")))throw new IOException();
   byte[] bytes=Base64.getDecoder().decode(value.substring(value.indexOf(',')+1));
   if(bytes.length>2*1024*1024)throw new IOException();
   try(var stream=ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))){
    var readers=ImageIO.getImageReaders(stream);if(!readers.hasNext())throw new IOException();var reader=readers.next();
    try{
     reader.setInput(stream);String format=reader.getFormatName();
     if(!format.equalsIgnoreCase("JPEG")&&!format.equalsIgnoreCase("PNG"))throw new IOException();
     int w=reader.getWidth(0),h=reader.getHeight(0);if(w<1||h<1||w>3200||h>3200)throw new IOException();
     var source=reader.read(0);double scale=Math.min(1,(double)maxSide/Math.max(w,h));
     var image=new BufferedImage(Math.max(1,(int)(w*scale)),Math.max(1,(int)(h*scale)),BufferedImage.TYPE_INT_RGB);
     var g=image.createGraphics();try{g.setColor(java.awt.Color.WHITE);g.fillRect(0,0,image.getWidth(),image.getHeight());g.drawImage(source,0,0,image.getWidth(),image.getHeight(),null);}finally{g.dispose();}
     var out=new ByteArrayOutputStream();ImageIO.write(image,"jpeg",out);return out.toByteArray();
    }finally{reader.dispose();}
   }
  }catch(Exception e){throw new BusinessException("Не удалось прочитать фото. Используйте JPEG или PNG до 2 МБ и 3200 пикселей по стороне");}
 }
}
