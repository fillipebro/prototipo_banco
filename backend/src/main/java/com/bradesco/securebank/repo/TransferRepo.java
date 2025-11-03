package com.bradesco.securebank.repo;
import com.bradesco.securebank.domain.Transfer;
import com.bradesco.securebank.domain.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface TransferRepo extends JpaRepository<Transfer, Long> {
    List<Transfer> findByUserOrderByCreatedAtDesc(AppUser user);
}