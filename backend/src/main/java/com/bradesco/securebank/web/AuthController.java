package com.bradesco.securebank.web;

import com.bradesco.securebank.domain.AppUser;
import com.bradesco.securebank.security.JwtUtil;
import com.bradesco.securebank.service.UserService;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController @RequestMapping("/api/auth") @Validated
public class AuthController {
    private final UserService userService;
    private final PasswordEncoder encoder;
    private final AuthenticationManager authManager;
    private final JwtUtil jwt;

    public AuthController(UserService userService, PasswordEncoder encoder, AuthenticationManager authManager, JwtUtil jwt) {
        this.userService = userService;
        this.encoder = encoder;
        this.authManager = authManager;
        this.jwt = jwt;
    }

    public record RegisterDto(@NotBlank String name,
                              @Pattern(regexp="^\d{11}$") String cpf,
                              @Email String email,
                              @NotBlank String password){}

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterDto dto){
        AppUser u = userService.register(dto.name(), dto.cpf(), dto.email(), dto.password());
        return ResponseEntity.ok(Map.of("id", u.getId(), "name", u.getName(), "email", u.getEmail()));
    }

    public record LoginDto(@NotBlank String identifier, @NotBlank String by, @NotBlank String password){}

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginDto dto){
        try{
            authManager.authenticate(new UsernamePasswordAuthenticationToken(dto.identifier(), dto.password()));
            AppUser u = userService.getByIdentifier(dto.identifier());
            String token = jwt.generate(Map.of("name", u.getName(), "email", u.getEmail()), u.getEmail());
            return ResponseEntity.ok(Map.of("token", token, "name", u.getName()));
        }catch(AuthenticationException ex){
            return ResponseEntity.status(401).body(Map.of("error", "Credenciais inválidas"));
        }
    }
}
