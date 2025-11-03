package com.bradesco.securebank.domain;

import jakarta.persistence.*;
import lombok.Data;

@Data @Entity @Table(name="users", uniqueConstraints={@UniqueConstraint(columnNames={"email"}), @UniqueConstraint(columnNames={"cpf"})})
public class AppUser {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false) private String name;
    @Column(nullable=false, unique=true) private String email;
    @Column(nullable=false, unique=true, length=11) private String cpf;
    @Column(nullable=false) private String passwordHash;
}
