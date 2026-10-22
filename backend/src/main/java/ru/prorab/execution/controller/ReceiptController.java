package ru.prorab.execution.controller;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import ru.prorab.execution.dto.*;
import ru.prorab.execution.service.ReceiptOcrService;
import java.util.UUID;
@RestController @RequestMapping("/api/projects/{projectId}/execution/receipt")
public class ReceiptController {
 private final ReceiptOcrService ocr;
 public ReceiptController(ReceiptOcrService ocr){this.ocr=ocr;}
 @PostMapping("/recognize") public ReceiptSuggestion recognize(@RequestAttribute UUID userId,@Valid @RequestBody StagePhotoInput photo){return ocr.recognize(userId,photo);}
}
