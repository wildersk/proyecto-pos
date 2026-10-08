package com.pos.backend.controller;

import com.pos.backend.dto.CrearUsuarioRequest;
import com.pos.backend.dto.LoginRequest;
import com.pos.backend.dto.LoginResponse;
import com.pos.backend.dto.UsuarioResponse;
import com.pos.backend.model.Usuario;
import com.pos.backend.repository.UsuarioRepository;
import com.pos.backend.security.TokenService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    // Hash de referencia para que un usuario inexistente tarde lo mismo que una contraseña incorrecta
    private final String dummyHash;

    public UsuarioController(UsuarioRepository repository, PasswordEncoder passwordEncoder, TokenService tokenService) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.dummyHash = passwordEncoder.encode("dummy-password");
    }

    @GetMapping
    public List<UsuarioResponse> getAll() {
        return repository.findAll().stream().map(UsuarioResponse::from).toList();
    }

    @PostMapping
    public ResponseEntity<UsuarioResponse> create(@Valid @RequestBody CrearUsuarioRequest request) {
        String username = request.username().trim();
        if (repository.findByUsernameIgnoreCase(username).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        Usuario usuario = new Usuario();
        usuario.setUsername(username);
        usuario.setPassword(passwordEncoder.encode(request.password()));
        usuario.setRole(request.role());
        return ResponseEntity.status(HttpStatus.CREATED).body(UsuarioResponse.from(repository.save(usuario)));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        Optional<Usuario> user = repository.findByUsernameIgnoreCase(request.username().trim());
        if (user.isEmpty()) {
            passwordEncoder.matches(request.password(), dummyHash);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!passwordEncoder.matches(request.password(), user.get().getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Usuario usuario = user.get();
        return ResponseEntity.ok(new LoginResponse(
                tokenService.generate(usuario),
                "Bearer",
                tokenService.getExpiration().toSeconds(),
                UsuarioResponse.from(usuario)));
    }
}
