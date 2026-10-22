package ru.prorab.execution.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.prorab.execution.entity.StagePhoto;
import java.util.*;
public interface StagePhotoRepository extends JpaRepository<StagePhoto,UUID> {
 Optional<StagePhoto> findByIdAndProjectId(UUID id,UUID projectId);
}
