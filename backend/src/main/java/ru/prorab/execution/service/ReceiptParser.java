package ru.prorab.execution.service;
import org.springframework.stereotype.Component;
import ru.prorab.execution.dto.ReceiptSuggestion;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.regex.Pattern;
@Component
public class ReceiptParser {
 private static final Pattern TOTAL=Pattern.compile("^(?:ИТОГ(?:О)?(?:\\s+К\\s+ОПЛАТЕ)?|К\\s+ОПЛАТЕ|СУММА\\s+РАСЧ[ЕЁ]ТА|TOTAL)(?![\\p{L}])",Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);
 private static final Pattern MONEY=Pattern.compile("(?<![\\d.,])(?:\\d{1,3}(?:[ \\u00a0]\\d{3})+|\\d{1,9})[.,]\\d{2}(?!\\d)");
 private static final Pattern DATE=Pattern.compile("(?<!\\d)(\\d{2})[./-](\\d{2})[./-](20\\d{2})(?!\\d)");
 public ReceiptSuggestion parse(String text){
  var lines=text.lines().map(String::strip).filter(s->!s.isEmpty()).toList();
  Set<BigDecimal> amounts=new LinkedHashSet<>();Set<LocalDate> dates=new LinkedHashSet<>();String title=null;
  boolean refund=Pattern.compile("ВОЗВРАТ|REFUND",Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE).matcher(text).find();
  for(int i=0;i<lines.size();i++){
   String line=lines.get(i);var label=TOTAL.matcher(line);
   if(label.find()){
    String rest=line.substring(label.end()).strip();
    // Never choose VAT, cash tendered, change or the largest number on the receipt.
    if(!Pattern.compile("НДС|НАЛОГ|СКИДК|СДАЧ|НАЛИЧ",Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE).matcher(rest).find()){
     if(rest.matches("[:=\\s₽]*")&&i+1<lines.size()&&lines.get(i+1).matches("[\\d\\s.,=₽РрУуБб.]+"))rest=lines.get(i+1);
     var m=MONEY.matcher(rest);var candidates=new ArrayList<BigDecimal>();while(m.find()){var value=new BigDecimal(m.group().replace(" ","").replace("\u00a0","").replace(',','.'));if(value.signum()>0&&value.compareTo(new BigDecimal("999999999"))<=0)candidates.add(value);}
     if(candidates.size()==1&&!rest.contains("-"))amounts.add(candidates.getFirst());
    }
   }
   var d=DATE.matcher(line);while(d.find())try{var date=LocalDate.of(Integer.parseInt(d.group(3)),Integer.parseInt(d.group(2)),Integer.parseInt(d.group(1)));if(!date.isAfter(LocalDate.now()))dates.add(date);}catch(java.time.DateTimeException ignored){}
   if(title==null&&i<8&&line.length()<=140&&line.matches("(?iu)^(?:ООО|ИП|АО|ПАО|МАГАЗИН)\\s+.*"))title="Покупка: "+line;
  }
  var warnings=new ArrayList<String>();warnings.add("Проверьте данные по фотографии перед сохранением.");
  BigDecimal amount=!refund&&amounts.size()==1?amounts.iterator().next():null;
  LocalDate date=dates.size()==1?dates.iterator().next():null;
  if(refund)warnings.add("Похоже на чек возврата. Автоматическое заполнение суммы отключено.");
  if(amount==null)warnings.add("Итоговая сумма не определена однозначно — укажите вручную.");
  if(date==null)warnings.add("Дата не определена однозначно — укажите вручную.");
  if(title==null)warnings.add("Название магазина не определено — укажите название расхода вручную.");
  return new ReceiptSuggestion(title,amount,date,List.copyOf(warnings));
 }
}
