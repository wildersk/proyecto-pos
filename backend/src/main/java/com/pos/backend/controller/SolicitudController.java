package com.pos.backend.controller;

import com.pos.backend.model.Solicitud;
import com.pos.backend.repository.SolicitudRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/solicitudes")
public class SolicitudController {

    @Autowired
    private SolicitudRepository repository;

    @GetMapping
    public List<Solicitud> getAll() {
        return repository.findAll();
    }

    @PostMapping
    public Solicitud create(@RequestBody Solicitud solicitud) {
        solicitud.setEstado("Pendiente");
        return repository.save(solicitud);
    }

    @PutMapping("/{id}/estado")
    public Solicitud updateEstado(@PathVariable Long id, @RequestBody String estado) {
        Solicitud solicitud = repository.findById(id).orElseThrow();
        solicitud.setEstado(estado);
        return repository.save(solicitud);
    }
}
