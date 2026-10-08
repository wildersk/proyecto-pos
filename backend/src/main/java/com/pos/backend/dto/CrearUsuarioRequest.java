package com.pos.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// Solo los campos que el cliente puede definir: el id lo asigna la base de datos
public record CrearUsuarioRequest(
        @NotBlank @Size(max = 50) String username,
        // BCrypt solo procesa los primeros 72 bytes
        @NotBlank @Size(max = 72) String password,
        @NotBlank @Pattern(regexp = "admin|[1-5]") String role
) {
}
