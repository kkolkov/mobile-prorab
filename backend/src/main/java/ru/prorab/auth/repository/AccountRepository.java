package ru.prorab.auth.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.prorab.auth.entity.Account;
import java.util.*;
public interface AccountRepository extends JpaRepository<Account,UUID> { Optional<Account> findByLogin(String login); }
