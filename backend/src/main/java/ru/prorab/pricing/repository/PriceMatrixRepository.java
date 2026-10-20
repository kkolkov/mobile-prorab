package ru.prorab.pricing.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.prorab.pricing.entity.PriceMatrixEntry;
public interface PriceMatrixRepository extends JpaRepository<PriceMatrixEntry,String> {}
