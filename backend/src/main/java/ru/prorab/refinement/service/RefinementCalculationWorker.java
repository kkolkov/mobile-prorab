package ru.prorab.refinement.service;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.*;
import ru.prorab.refinement.dto.RefinedEstimate;
@Component
public class RefinementCalculationWorker {
    private final RefinementCalculator calculator;
    private final RefinementService service;
    public RefinementCalculationWorker(RefinementCalculator calculator,RefinementService service){this.calculator=calculator;this.service=service;}
    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void recoverPending(){service.resumePending();}
    @Async
    @TransactionalEventListener(phase=TransactionPhase.AFTER_COMMIT)
    public void calculate(RefinementService.Calculation job){
        RefinedEstimate result;
        try{result=calculator.calculate(job.id(),job.revision(),job.input(),job.allocation());}
        catch(RuntimeException e){result=null;}
        service.complete(job,result);
    }
}
