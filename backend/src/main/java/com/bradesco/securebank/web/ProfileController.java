package com.bradesco.securebank.web;

import com.bradesco.securebank.domain.AppUser;
import com.bradesco.securebank.repo.UserRepo;
import com.bradesco.securebank.service.UserService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController @RequestMapping("/api/users")
public class ProfileController {
    private final UserRepo repo;
    private final UserService userService;

    public ProfileController(UserRepo repo, UserService userService){
        this.repo = repo; this.userService = userService;
    }

    @GetMapping("/me")
    public Map<String,Object> me(@AuthenticationPrincipal User principal){
        AppUser u = userService.getByIdentifier(principal.getUsername());
        return Map.of("id", u.getId(), "name", u.getName(), "email", u.getEmail(), "cpf", u.getCpf());
    }
}
