package ru.prorab.pricing.controller;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import ru.prorab.pricing.dto.*;
import ru.prorab.pricing.service.PriceAdminService;
@RestController
@RequestMapping("/api/porabadmin/prices")
public class PriceAdminController {
 private final PriceAdminService service;
 public PriceAdminController(PriceAdminService service){this.service=service;}
 @GetMapping public PriceAdminService.Catalog list(){return service.list();}
 @PutMapping("/{code}") public PriceRow save(@PathVariable String code,@Valid @RequestBody PriceInput input){return service.save(code,input);}
 @PostMapping("/{code}/delete") public void delete(@PathVariable String code,@RequestParam long version){service.delete(code,version);}
}
