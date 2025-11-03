package com.bradesco.securebank.web;

import com.bradesco.securebank.domain.AppUser;
import com.bradesco.securebank.domain.Transfer;
import com.bradesco.securebank.service.TransferService;
import com.bradesco.securebank.service.UserService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/transfers") @Validated
public class TransferController {
    private final TransferService service;
    private final UserService userService;

    public TransferController(TransferService service, UserService userService){
        this.service = service; this.userService = userService;
    }

    public record CreateDto(@NotBlank String type, @NotBlank String amount,
                            @Pattern(regexp="^\d{11}$", message="CPF deve conter 11 dígitos") String toCpf){}

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateDto dto, @AuthenticationPrincipal User principal){
        AppUser u = userService.getByIdentifier(principal.getUsername());
        Transfer t = service.create(u, dto.type(), new BigDecimal(dto.amount().replace(",", ".")), dto.toCpf());
        return ResponseEntity.ok(Map.of(
            "id", t.getId(),
            "status", t.getStatus(),
            "riskReason", t.getRiskReason(),
            "type", t.getType(),
            "amount", t.getAmount(),
            "toCpf", t.getToCpf(),
            "verification", t.getVerificationCode(),
            "createdAt", t.getCreatedAt().toString()
        ));
    }

    @GetMapping
    public List<Transfer> list(@AuthenticationPrincipal User principal){
        AppUser u = userService.getByIdentifier(principal.getUsername());
        return service.list(u);
    }
}
