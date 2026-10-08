package com.pos.backend;

import com.jayway.jsonpath.JsonPath;
import com.pos.backend.model.Usuario;
import com.pos.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private UsuarioRepository repository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // El backend no crea usuarios al arrancar: los tests preparan los suyos
    @BeforeEach
    void crearUsuariosDePrueba() {
        crearSiNoExiste("Administrador", "admin");
        for (int etapa = 1; etapa <= 5; etapa++) {
            crearSiNoExiste("Etapa" + etapa, String.valueOf(etapa));
        }
    }

    private void crearSiNoExiste(String username, String role) {
        if (repository.findByUsernameIgnoreCase(username).isPresent()) return;
        Usuario usuario = new Usuario();
        usuario.setUsername(username);
        usuario.setPassword(passwordEncoder.encode("12345"));
        usuario.setRole(role);
        repository.save(usuario);
    }

    private String login(String username, String password) throws Exception {
        String body = mvc.perform(post("/api/usuarios/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.token");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    @Test
    void endpointsRequierenAutenticacion() throws Exception {
        mvc.perform(get("/api/solicitudes")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/usuarios")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"x\",\"password\":\"x\",\"role\":\"admin\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/solicitudes").header("Authorization", "Bearer token-invalido"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginNoDevuelveContrasena() throws Exception {
        mvc.perform(post("/api/usuarios/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"Administrador\",\"password\":\"12345\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.usuario.username").value("Administrador"))
                .andExpect(jsonPath("$.usuario.role").value("admin"))
                .andExpect(jsonPath("$.usuario.password").doesNotExist())
                .andExpect(content().string(not(containsString("12345"))));
    }

    @Test
    void loginConCredencialesInvalidas() throws Exception {
        mvc.perform(post("/api/usuarios/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"Administrador\",\"password\":\"incorrecta\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/usuarios/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"NoExiste\",\"password\":\"12345\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listadoDeUsuariosNoExponeContrasenas() throws Exception {
        String token = login("Administrador", "12345");
        mvc.perform(get("/api/usuarios").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").exists())
                .andExpect(jsonPath("$[*].password").isEmpty());
    }

    @Test
    void soloAdminGestionaUsuarios() throws Exception {
        String token = login("Etapa1", "12345");
        mvc.perform(get("/api/usuarios").header("Authorization", bearer(token)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/usuarios").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"intruso\",\"password\":\"x\",\"role\":\"admin\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void crearUsuarioIgnoraIdYNoSobrescribeAlAdmin() throws Exception {
        String token = login("Administrador", "12345");
        mvc.perform(post("/api/usuarios").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":1,\"username\":\"Administrador\",\"password\":\"hackeado\",\"role\":\"admin\"}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/usuarios").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":1,\"username\":\"nuevoUsuario\",\"password\":\"secreta\",\"role\":\"2\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(not(1)))
                .andExpect(jsonPath("$.password").doesNotExist());

        // El admin conserva su contraseña y el nuevo usuario puede iniciar sesión
        login("Administrador", "12345");
        login("nuevoUsuario", "secreta");
    }

    @Test
    void crearUsuarioValidaRol() throws Exception {
        String token = login("Administrador", "12345");
        mvc.perform(post("/api/usuarios").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"rolInvalido\",\"password\":\"x\",\"role\":\"superadmin\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void permisosPorEtapa() throws Exception {
        String etapa1 = login("Etapa1", "12345");
        String etapa2 = login("Etapa2", "12345");
        String etapa5 = login("Etapa5", "12345");

        String body = mvc.perform(post("/api/solicitudes").header("Authorization", bearer(etapa1))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"giroNegocio\":\"Tienda\",\"datosFiscales\":\"NIT\",\"modalidadPos\":\"normal\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Integer id = JsonPath.read(body, "$.id");

        // Etapa 1 no puede aprobar; etapa 2 sí
        mvc.perform(put("/api/solicitudes/" + id + "/estado").header("Authorization", bearer(etapa1))
                        .contentType(MediaType.TEXT_PLAIN).content("Aprobada"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/solicitudes/" + id + "/estado").header("Authorization", bearer(etapa2))
                        .contentType(MediaType.TEXT_PLAIN).content("Aprobada"))
                .andExpect(status().isOk());

        // Etapa 5 no puede crear solicitudes ni leer afiliados, pero sí órdenes de despacho
        mvc.perform(post("/api/solicitudes").header("Authorization", bearer(etapa5))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/afiliados").header("Authorization", bearer(etapa5)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/ordenes-despacho").header("Authorization", bearer(etapa5)))
                .andExpect(status().isOk());
    }
}
