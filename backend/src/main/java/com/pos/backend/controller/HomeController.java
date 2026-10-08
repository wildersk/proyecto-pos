package com.pos.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HomeController {

    @GetMapping("/")
    public Map<String, Object> home() {
        return Map.of(
            "status", "online",
            "message", "Backend Proyecto POS (Spring Boot) en funcionamiento",
            "endpoints", Map.of(
                "usuarios", "/api/usuarios",
                "login", "/api/usuarios/login",
                "solicitudes", "/api/solicitudes",
                "afiliados", "/api/afiliados",
                "terminales", "/api/terminales",
                "ordenesDespacho", "/api/ordenes-despacho"
            ),
            "frontendUrl", "http://localhost:5173"
        );
    }
}
