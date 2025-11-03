package com.bradesco.securebank.service;

import com.bradesco.securebank.domain.AppUser;
import com.bradesco.securebank.domain.Contact;
import com.bradesco.securebank.repo.ContactRepo;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ContactService {
    private final ContactRepo repo;
    public ContactService(ContactRepo repo){ this.repo = repo; }
    public Contact add(AppUser owner, String name, String cpf){
        Contact c = new Contact();
        c.setOwner(owner); c.setName(name); c.setCpf(cpf);
        return repo.save(c);
    }
    public List<Contact> list(AppUser owner){ return repo.findByOwnerOrderByNameAsc(owner); }
    public void remove(AppUser owner, Long id){
        repo.findById(id).filter(c -> c.getOwner().getId().equals(owner.getId())).ifPresent(repo::delete);
    }
}
