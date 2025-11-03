package com.bradesco.securebank.domain;

import jakarta.persistence.*;
import lombok.Data;

@Data @Entity
public class Contact {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional=false) private AppUser owner;
    private String name;
    @Column(length=11) private String cpf;
}
