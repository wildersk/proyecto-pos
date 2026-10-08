package com.pos.backend.controller;

import com.pos.backend.model.Afiliado;
import com.pos.backend.repository.AfiliadoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Random;

@RestController
@RequestMapping("/api/afiliados")
public class AfiliadoController {

    @Autowired
    private AfiliadoRepository repository;

    @GetMapping
    public List<Afiliado> getAll() {
        return repository.findAll();
    }

    @PostMapping
    public Afiliado create(@RequestBody Afiliado afiliado) {
        if(afiliado.getNumeroAfiliado() == null || afiliado.getNumeroAfiliado().isEmpty()) {
            String random8 = String.format("%08d", new Random().nextInt(100000000));
            afiliado.setNumeroAfiliado(random8);
        }
        return repository.save(afiliado);
    }
}
