package ru.prorab.onboarding.repository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import ru.prorab.onboarding.entity.UserAccess;
import java.util.*;
public interface AccessRepository extends JpaRepository<UserAccess,UUID> {
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select u from UserAccess u where u.userId=:id")
 Optional<UserAccess> locked(UUID id);
}
