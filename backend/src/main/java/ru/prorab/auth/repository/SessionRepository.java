package ru.prorab.auth.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.prorab.auth.entity.AuthSession;
public interface SessionRepository extends JpaRepository<AuthSession,String> { void deleteByUserIdAndTokenHashNot(java.util.UUID userId,String tokenHash); }
