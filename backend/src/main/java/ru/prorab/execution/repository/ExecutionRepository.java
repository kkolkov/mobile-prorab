package ru.prorab.execution.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.prorab.execution.entity.ProjectExecution;
import java.util.UUID;
public interface ExecutionRepository extends JpaRepository<ProjectExecution,UUID>{}
