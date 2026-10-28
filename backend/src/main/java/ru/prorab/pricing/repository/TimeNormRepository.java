package ru.prorab.pricing.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.prorab.pricing.entity.TimeNorm;
public interface TimeNormRepository extends JpaRepository<TimeNorm,String>{}
