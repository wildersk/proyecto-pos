package com.pos.backend.controller;

import com.pos.backend.model.Terminal;
import com.pos.backend.repository.TerminalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/terminales")
public class TerminalController {

    @Autowired
    private TerminalRepository repository;

    @GetMapping
    public List<Terminal> getAll() {
        return repository.findAll();
    }

    @PostMapping
    public Terminal create(@RequestBody Terminal terminal) {
        return repository.save(terminal);
    }
}
