package ru.prorab.pricing.service;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import ru.prorab.pricing.entity.CalculationCoefficient;
import ru.prorab.pricing.repository.CoefficientRepository;
import ru.prorab.pricing.dto.*;
import ru.prorab.common.exception.*;
import java.util.*;
import java.math.BigDecimal;
@Service
public class CoefficientCatalog {
 private final CoefficientRepository repository;
 public CoefficientCatalog(CoefficientRepository repository){this.repository=repository;}
 @Transactional(readOnly=true) public List<CoefficientRow> list(){return repository.findAll().stream().sorted(Comparator.comparing(CalculationCoefficient::getCode)).map(this::row).toList();}
 public record Snapshot(Map<String,BigDecimal> values){
  public BigDecimal get(String code){var v=values.get(code);if(v==null)throw new IllegalStateException("Missing coefficient: "+code);return v;}
  public String description(){return values.entrySet().stream().sorted(Map.Entry.comparingByKey()).map(e->e.getKey()+"="+e.getValue().stripTrailingZeros().toPlainString()).collect(java.util.stream.Collectors.joining(", "));}
 }
 @Transactional(readOnly=true) public Snapshot snapshot(){Map<String,BigDecimal> values=new TreeMap<>();for(var r:repository.findAll())values.put(r.getCode(),r.getValue());return new Snapshot(Map.copyOf(values));}
 @Transactional public CoefficientRow save(String code,CoefficientInput input){
  var c=repository.findById(code).orElseThrow(()->new ResourceNotFoundException("Коэффициент не найден"));
  if(c.getVersion()!=input.version())throw new ObjectOptimisticLockingFailureException(CalculationCoefficient.class,code);
  if(input.value().compareTo(c.getMinimum())<0||input.value().compareTo(c.getMaximum())>0)throw new BusinessException("Допустимое значение: от "+c.getMinimum()+" до "+c.getMaximum());
  c.update(input.value());return row(repository.saveAndFlush(c));
 }
 private CoefficientRow row(CalculationCoefficient c){return new CoefficientRow(c.getCode(),c.getTitle(),c.getDescription(),c.getValue(),c.getMinimum(),c.getMaximum(),c.getVersion());}
}
