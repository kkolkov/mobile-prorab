package ru.prorab.refinement.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.prorab.refinement.entity.ProjectRefinement;
import java.util.UUID;
public interface RefinementRepository extends JpaRepository<ProjectRefinement,UUID> {
    java.util.List<ProjectRefinement> findByCalculationStatus(String status);
}
