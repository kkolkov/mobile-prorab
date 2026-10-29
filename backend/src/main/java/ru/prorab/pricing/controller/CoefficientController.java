package ru.prorab.pricing.controller;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import ru.prorab.pricing.dto.*;
import ru.prorab.pricing.service.CoefficientCatalog;
@RestController @RequestMapping("/api/porabadmin/coefficients")
public class CoefficientController {
 private final CoefficientCatalog catalog;
 public CoefficientController(CoefficientCatalog catalog){this.catalog=catalog;}
 @GetMapping public List<CoefficientRow> list(){return catalog.list();}
 @PutMapping("/{code}") public CoefficientRow save(@PathVariable String code,@Valid @RequestBody CoefficientInput input){return catalog.save(code,input);}
}
