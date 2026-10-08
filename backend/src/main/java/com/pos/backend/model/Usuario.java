package com.pos.backend.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.ToString;

@Data
@Entity
@Table(name = "usuarios")
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    // Hash BCrypt; nunca se serializa ni aparece en logs
    @JsonIgnore
    @ToString.Exclude
    @Column(nullable = false)
    private String password;

    // Puede ser 'admin', '1', '2', '3', '4', '5'
    @Column(nullable = false)
    private String role;
}
