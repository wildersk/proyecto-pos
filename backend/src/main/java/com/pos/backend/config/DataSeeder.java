package com.pos.backend.config;

import com.pos.backend.model.Usuario;
import com.pos.backend.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Crea los usuarios de prueba la primera vez que se arranca contra una base de datos vacía.
 *
 * Existe porque la API no permite arrancar de cero: crear usuarios exige ROLE_ADMIN
 * (ver SecurityConfig) y obtener ese rol exige un usuario que ya esté en la tabla.
 * Sin esta siembra, una instalación nueva queda inaccesible.
 *
 * Solo actúa si la tabla no tiene ninguna fila, así que nunca sobrescribe contraseñas
 * ni resucita usuarios borrados a mano. Se desactiva con pos.seed.enabled=false.
 */
@Configuration
@ConditionalOnProperty(name = "pos.seed.enabled", havingValue = "true", matchIfMissing = true)
public class DataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    // username -> role ('admin' o la etapa '1'..'5' que puede atender)
    private static final Map<String, String> USUARIOS_INICIALES = new LinkedHashMap<>();

    static {
        USUARIOS_INICIALES.put("administrador1", "admin");
        USUARIOS_INICIALES.put("etapa1", "1"); // Servicio al Cliente
        USUARIOS_INICIALES.put("etapa2", "2"); // Validación de Documentos
        USUARIOS_INICIALES.put("etapa3", "3"); // Programación
        USUARIOS_INICIALES.put("etapa4", "4"); // Entrega
        USUARIOS_INICIALES.put("etapa5", "5"); // Instalación
    }

    @Bean
    ApplicationRunner sembrarUsuarios(UsuarioRepository repository,
                                      PasswordEncoder passwordEncoder,
                                      @Value("${pos.seed.password:Password123!}") String password) {
        return args -> {
            if (repository.count() > 0) {
                log.debug("La tabla usuarios ya tiene datos: se omite la siembra inicial.");
                return;
            }

            USUARIOS_INICIALES.forEach((username, role) -> {
                Usuario usuario = new Usuario();
                usuario.setUsername(username);
                usuario.setPassword(passwordEncoder.encode(password));
                usuario.setRole(role);
                repository.save(usuario);
            });

            log.warn("Base de datos vacía: se crearon {} usuarios de prueba ({}) con una contraseña compartida. "
                            + "Cámbiala antes de exponer este backend fuera de desarrollo.",
                    USUARIOS_INICIALES.size(), String.join(", ", USUARIOS_INICIALES.keySet()));
        };
    }
}
