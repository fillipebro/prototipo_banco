package com.bradesco.securebank.repo;
import com.bradesco.securebank.domain.Contact;
import com.bradesco.securebank.domain.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ContactRepo extends JpaRepository<Contact, Long> {
    List<Contact> findByOwnerOrderByNameAsc(AppUser owner);
}