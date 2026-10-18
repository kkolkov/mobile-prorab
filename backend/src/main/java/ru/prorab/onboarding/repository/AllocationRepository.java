package ru.prorab.onboarding.repository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import ru.prorab.onboarding.entity.Allocation;
public interface AllocationRepository extends JpaRepository<Allocation,Integer> {
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select a from Allocation a where a.id=1") Allocation locked();
}
