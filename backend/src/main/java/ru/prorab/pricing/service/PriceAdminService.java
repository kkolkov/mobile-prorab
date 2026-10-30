package ru.prorab.pricing.service;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import ru.prorab.pricing.repository.PriceMatrixRepository;
import ru.prorab.pricing.entity.PriceMatrixEntry;
import ru.prorab.pricing.dto.*;
import ru.prorab.pricing.model.PriceDefinitions;
import ru.prorab.pricing.model.PriceClassification;
import ru.prorab.common.exception.*;
import java.util.*;
import java.math.BigDecimal;
@Service
public class PriceAdminService {
 private final PriceMatrixRepository repository;
 public PriceAdminService(PriceMatrixRepository repository){this.repository=repository;}
 public record Catalog(List<PriceRow> rows,List<PriceDefinitions.Definition> missing){}
 @Transactional(readOnly=true) public Catalog list(){
  var rows=repository.findAll().stream().sorted(Comparator.comparing(PriceMatrixEntry::getCode)).map(this::row).toList();
  return new Catalog(rows,PriceDefinitions.ALL.stream().filter(d->rows.stream().noneMatch(r->r.code().equals(d.code()))).toList());
 }
 @Transactional public PriceRow save(String code,PriceInput input){
  if(input.roughShare().add(input.laborShare()).compareTo(BigDecimal.ONE)>0)throw new BusinessException("Сумма долей черновых материалов и работ не может превышать 100%");
  if(input.priceDate().getYear()<2000)throw new BusinessException("Дата цены должна быть не раньше 2000 года");
  var p=repository.findById(code).orElse(null);
  if(p==null){
   if(input.version()!=null)throw new ResourceNotFoundException("Строка удалена. Обновите справочник");
   var definition=PriceDefinitions.ALL.stream().filter(d->d.code().equals(code)).findFirst().orElseThrow(()->new BusinessException("Код не поддерживается калькулятором"));
   p=new PriceMatrixEntry(code,definition.title(),definition.unit());
  }else check(p,input.version());
  if(!input.verified())throw new BusinessException("Подтвердите проверку цены по указанному источнику");
  if(input.name()!=null){if(input.name().isBlank())throw new BusinessException("Укажите наименование позиции");p.rename(input.name().strip());}
  if(input.category()!=null||input.subcategory()!=null){
   if(input.subcategory()==null||!PriceClassification.GROUPS.getOrDefault(input.category()==null?"":input.category(),List.of()).contains(input.subcategory()))throw new BusinessException("Выберите допустимую категорию и подкатегорию");
   p.classify(input.category(),input.subcategory());
  }
  if(input.status()!=null&&!Set.of("review","approved","deleted").contains(input.status()))throw new BusinessException("Неизвестный статус позиции");
  if(input.status()!=null)p.setDeleted(input.status().equals("deleted"));
  p.update(input.unitPriceRub(),input.roughShare(),input.laborShare(),input.sourceNote().trim(),input.priceDate(),input.verified());
  try{return row(repository.saveAndFlush(p));}
  catch(DataIntegrityViolationException e){throw new BusinessException("Строка уже создана в другом сеансе. Обновите справочник");}
 }
 @Transactional public void delete(String code,long version){
  var p=repository.findById(code).orElseThrow(()->new ResourceNotFoundException("Строка уже удалена"));check(p,version);p.setDeleted(true);repository.saveAndFlush(p);
 }
 private void check(PriceMatrixEntry p,Long version){if(version==null||version!=p.getVersion())throw new ObjectOptimisticLockingFailureException(PriceMatrixEntry.class,p.getCode());}
 private PriceRow row(PriceMatrixEntry p){var c=PriceClassification.of(p);return new PriceRow(p.getCode(),PriceClassification.title(p,c),p.getUnit(),p.getUnitPriceRub(),p.getRoughShare(),p.getLaborShare(),p.getSourceNote(),p.getPriceDate(),p.isVerified(),p.getVersion(),c.category(),c.subcategory(),p.isDeleted()?"deleted":p.isVerified()?"approved":"review",PriceClassification.name(p));}
}
