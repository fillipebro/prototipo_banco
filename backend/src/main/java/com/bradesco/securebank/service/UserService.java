package com.bradesco.securebank.service;

import com.bradesco.securebank.domain.AppUser;
import com.bradesco.securebank.repo.UserRepo;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class UserService implements UserDetailsService {
    private final UserRepo userRepo;
    private final PasswordEncoder encoder;

    public UserService(UserRepo userRepo, PasswordEncoder encoder) {
        this.userRepo = userRepo;
        this.encoder = encoder;
    }

    public AppUser register(String name, String cpf, String email, String rawPassword){
        AppUser u = new AppUser();
        u.setName(name);
        u.setCpf(cpf);
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(rawPassword));
        return userRepo.save(u);
    }

    public AppUser getByIdentifier(String identifier){
        return userRepo.findByEmail(identifier).orElseGet(() -> userRepo.findByCpf(identifier).orElse(null));
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        AppUser u = getByIdentifier(username);
        if (u == null) throw new UsernameNotFoundException("Usuário não encontrado");
        return new User(u.getEmail(), u.getPasswordHash(), Collections.emptyList());
    }
}
