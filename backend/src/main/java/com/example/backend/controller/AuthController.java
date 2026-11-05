package com.example.backend.controller;

import com.example.backend.controller.Requests.*;
import com.example.backend.model.Models.*;
import com.example.backend.service.ContaService;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api")
public class AuthController {
    private final ContaService accounts;
    private final SecurityContextRepository contexts;
    public AuthController(ContaService accounts, SecurityContextRepository contexts) { this.accounts=accounts; this.contexts=contexts; }
    @GetMapping("/health") public Map<String,String> health() { return Map.of("status","ok"); }
    @GetMapping("/auth/csrf") public Map<String,String> csrf(CsrfToken token) { return Map.of("token",token.getToken(),"headerName",token.getHeaderName()); }
    @PostMapping("/auth/cadastro") @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public Conta register(@Valid @RequestBody Cadastro input) { return accounts.cadastrar(input); }
    @PostMapping("/auth/login")
    public Conta login(@Valid @RequestBody Login input, HttpServletRequest req, HttpServletResponse res) {
        Usuario u=accounts.autenticar(input);
        if (req.getSession(false)!=null) req.changeSessionId();
        var context=SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(u.usuario(),null,
            List.of(new SimpleGrantedAuthority("ROLE_"+u.perfil()))));
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context,req,res);
        new HttpSessionCsrfTokenRepository().saveToken(null,req,res);
        return u.conta();
    }
    @GetMapping("/auth/me") public Conta me(Principal p) { return accounts.atual(p.getName()).conta(); }
}
