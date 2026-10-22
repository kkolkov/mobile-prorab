package ru.prorab.execution;
import org.junit.jupiter.api.Test;
import ru.prorab.execution.service.ReceiptParser;
import java.math.BigDecimal;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;
class ReceiptParserTest {
 private final ReceiptParser parser=new ReceiptParser();
 @Test void totalIsNotVatCashOrChange(){var r=parser.parse("ООО Строймагазин\n22.10.2025 10:30\nКраска 1200.00\nИТОГО: 1 234,50\nНДС 205.75\nНАЛИЧНЫМИ 5000.00\nСДАЧА 3765.50");assertEquals(new BigDecimal("1234.50"),r.amount());assertEquals(LocalDate.of(2025,10,22),r.date());assertEquals("Покупка: ООО Строймагазин",r.title());}
 @Test void totalCanBeOnNextLine(){assertEquals(new BigDecimal("1234.50"),parser.parse("ИТОГО\n1234.50\nНДС 205.75").amount());}
 @Test void ambiguousTotalsAndDatesAreNotGuessed(){var r=parser.parse("ИТОГО 100.00\nИТОГО 200.00\n22.10.2025\n23.10.2025");assertNull(r.amount());assertNull(r.date());assertTrue(r.warnings().size()>=3);}
 @Test void noTotalDoesNotUseLargestNumberOrVat(){assertNull(parser.parse("Штукатурка 100.00\nНАЛИЧНЫМИ 1000.00\nИТОГО НДС 20.00").amount());assertNull(parser.parse("ИТОГО\nНДС 20.00").amount());}
 @Test void refundIsNotPositiveExpense(){assertNull(parser.parse("ВОЗВРАТ ПРИХОДА\nИТОГО 100.00").amount());}
 @Test void badOrFutureDateIsNotGuessed(){assertNull(parser.parse("31.02.2025\n01.01.2099").date());}
}
