package ru.prorab.project.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.prorab.project.entity.Project;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    java.util.List<Project> findByOwnerIdOrderByUpdatedAtDesc(UUID ownerId);
    boolean existsByOwnerIdAndStatus(UUID ownerId, ru.prorab.project.model.ProjectStatus status);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from Project p where p.projectId = :id")
    java.util.Optional<Project> findForUpdate(@org.springframework.data.repository.query.Param("id") UUID id);
}
