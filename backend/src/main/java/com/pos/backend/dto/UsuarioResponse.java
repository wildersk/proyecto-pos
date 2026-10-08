package com.pos.backend.dto;

import com.pos.backend.model.Usuario;

// Representación pública de un usuario: nunca incluye la contraseña
public record UsuarioResponse(Long id, String username, String role) {

    public static UsuarioResponse from(Usuario usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getUsername(), usuario.getRole());
    }
}
