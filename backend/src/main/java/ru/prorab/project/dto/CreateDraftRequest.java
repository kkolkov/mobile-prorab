package ru.prorab.project.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record CreateDraftRequest(
        @DecimalMin(value = "0.1") @DecimalMax(value = "1000") @NotNull BigDecimal areaM2,
        @Size(max = 250) String address,
        @Size(max = 100) String name,
        @jakarta.validation.Valid ru.prorab.onboarding.dto.AnswersRequest questionnaire
) {
 public CreateDraftRequest(BigDecimal areaM2,String address,String name){this(areaM2,address,name,null);}
}
