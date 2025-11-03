package com.bradesco.securebank.domain;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data @Entity
public class Transfer {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional=false) private AppUser user;
    @Column(nullable=false) private String type; // pix | ted
    @Column(nullable=false, precision=16, scale=2) private BigDecimal amount;
    @Column(length=11) private String toCpf;
    @Column(nullable=false) private String status; // APPROVED | BLOCKED
    @Column(nullable=false) private LocalDateTime createdAt;
    @Column(nullable=false) private String riskReason; // human-readable
    @Column(nullable=false) private String verificationCode; // simple checksum for receipt
}
