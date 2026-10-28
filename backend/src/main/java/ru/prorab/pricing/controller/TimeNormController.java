package ru.prorab.pricing.controller;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import ru.prorab.pricing.dto.*;
import ru.prorab.pricing.service.TimeNormCatalog;
@RestController @RequestMapping("/api/porabadmin/time-norms")
public class TimeNormController {
 private final TimeNormCatalog catalog;
 public TimeNormController(TimeNormCatalog catalog){this.catalog=catalog;}
 @GetMapping public List<TimeNormRow> list(){return catalog.list();}
 @PutMapping("/{code}") public TimeNormRow save(@PathVariable String code,@Valid @RequestBody TimeNormInput input){return catalog.save(code,input);}
}
