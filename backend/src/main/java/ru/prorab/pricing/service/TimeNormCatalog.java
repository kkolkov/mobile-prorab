package ru.prorab.pricing.service;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import ru.prorab.pricing.entity.TimeNorm;
import ru.prorab.pricing.repository.TimeNormRepository;
import ru.prorab.pricing.dto.*;
import ru.prorab.common.exception.*;
import java.util.*;
@Service
public class TimeNormCatalog {
 private final TimeNormRepository repository;
 public TimeNormCatalog(TimeNormRepository repository){this.repository=repository;}
 @Transactional(readOnly=true) public List<TimeNormRow> list(){return repository.findAll().stream().sorted(Comparator.comparing(TimeNorm::getCode)).map(this::row).toList();}
 @Transactional public TimeNormRow save(String code,TimeNormInput input){
  var norm=repository.findById(code).orElseThrow(()->new ResourceNotFoundException("Норма времени не найдена"));
  if(input.version()==null||norm.getVersion()!=input.version())throw new ObjectOptimisticLockingFailureException(TimeNorm.class,code);
  if(input.sourceDate().getYear()<2000)throw new BusinessException("Дата должна быть не раньше 2000 года");
  norm.update(input.personHoursPer100m2(),input.sourceNote().trim(),input.sourceDate());return row(repository.saveAndFlush(norm));
 }
 private TimeNormRow row(TimeNorm n){return new TimeNormRow(n.getCode(),n.getTitle(),n.getPersonHoursPer100m2(),n.getSourceNote(),n.getSourceDate(),n.getVersion());}
}
