package ru.prorab.onboarding.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.prorab.onboarding.entity.OnboardingEvent;
import java.util.UUID;
public interface EventRepository extends JpaRepository<OnboardingEvent,UUID> {}
