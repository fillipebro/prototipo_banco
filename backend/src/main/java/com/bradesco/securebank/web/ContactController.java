package com.bradesco.securebank.web;

import com.bradesco.securebank.domain.AppUser;
import com.bradesco.securebank.domain.Contact;
import com.bradesco.securebank.service.ContactService;
import com.bradesco.securebank.service.UserService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/contacts") @Validated
public class ContactController {
    private final ContactService service;
    private final UserService userService;

    public ContactController(ContactService service, UserService userService){
        this.service = service; this.userService = userService;
    }

    public record AddDto(@NotBlank String name, @Pattern(regexp="^\d{11}$") String cpf){}

    @PostMapping
    public Contact add(@RequestBody AddDto dto, @AuthenticationPrincipal User principal){
        AppUser u = userService.getByIdentifier(principal.getUsername());
        return service.add(u, dto.name(), dto.cpf());
    }

    @GetMapping
    public List<Contact> list(@AuthenticationPrincipal User principal){
        AppUser u = userService.getByIdentifier(principal.getUsername());
        return service.list(u);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> remove(@PathVariable Long id, @AuthenticationPrincipal User principal){
        AppUser u = userService.getByIdentifier(principal.getUsername());
        service.remove(u, id);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
