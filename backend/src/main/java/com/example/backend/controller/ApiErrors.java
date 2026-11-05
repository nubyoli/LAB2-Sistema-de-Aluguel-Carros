package com.example.backend.controller;

import com.example.backend.service.RegraException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class ApiErrors {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ApiErrors.class);
    @ExceptionHandler(RegraException.class)
    ResponseEntity<?> business(RegraException e) { return ResponseEntity.status(e.status).body(Map.of("message",e.getMessage())); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException e) {
        String message=e.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField()+": "+f.getDefaultMessage()).distinct().collect(Collectors.joining("; "));
        return ResponseEntity.badRequest().body(Map.of("message",message));
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<?> malformed() { return ResponseEntity.badRequest().body(Map.of("message","Dados inválidos. Confira os campos e as datas.")); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> conflict(DataIntegrityViolationException error) {
        // Detalhes SQL só em DEBUG no servidor; nunca são enviados ao navegador.
        log.debug("Operação recusada pelo banco", error);
        return ResponseEntity.status(409).body(Map.of("message","Registro duplicado ou vinculado a outros dados. Confira usuário, CPF, RG, matrícula, placa e referência do crédito."));
    }
}
