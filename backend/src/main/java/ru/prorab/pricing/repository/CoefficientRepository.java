package ru.prorab.pricing.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.prorab.pricing.entity.CalculationCoefficient;
public interface CoefficientRepository extends JpaRepository<CalculationCoefficient,String>{}
