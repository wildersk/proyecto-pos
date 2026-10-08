package com.pos.backend.controller;

import com.pos.backend.model.OrdenDespacho;
import com.pos.backend.repository.OrdenDespachoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/ordenes-despacho")
public class OrdenDespachoController {

    @Autowired
    private OrdenDespachoRepository repository;

    @GetMapping
    public List<OrdenDespacho> getAll() {
        return repository.findAll();
    }

    @PostMapping
    public OrdenDespacho create(@RequestBody OrdenDespacho orden) {
        orden.setEstadoInstalacion("Pendiente");
        return repository.save(orden);
    }

    @PutMapping("/{id}/estado")
    public OrdenDespacho updateEstado(@PathVariable Long id, @RequestBody String estado) {
        OrdenDespacho orden = repository.findById(id).orElseThrow();
        orden.setEstadoInstalacion(estado);
        return repository.save(orden);
    }
}
