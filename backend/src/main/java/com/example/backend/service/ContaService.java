package com.example.backend.service;

import com.example.backend.controller.Requests.*;
import com.example.backend.model.Models.*;
import com.example.backend.repository.LocadoraRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.UUID;

@Service
public class ContaService {
    private final LocadoraRepository db;
    private final PasswordEncoder passwords;
    private final String agentCode;
    private final String dummyHash;
    public ContaService(LocadoraRepository db, PasswordEncoder passwords,
        @Value("${app.agent-registration-code}") String agentCode) {
        this.db=db; this.passwords=passwords; this.agentCode=agentCode;
        this.dummyHash=passwords.encode(UUID.randomUUID().toString());
    }
    public Usuario atual(String login) { return db.usuario(login).orElseThrow(() -> new RegraException(401,"Sessão inválida.")); }
    @Transactional
    public Conta cadastrar(Cadastro c) {
        if (c.senha().getBytes(StandardCharsets.UTF_8).length>72) throw new RegraException(400,"Senha excede 72 bytes. Use menos caracteres.");
        if (!c.perfil().equals("CLIENTE") && (agentCode.isBlank() || c.codigoAgente()==null ||
            !MessageDigest.isEqual(agentCode.getBytes(StandardCharsets.UTF_8),c.codigoAgente().getBytes(StandardCharsets.UTF_8))))
            throw new RegraException(403,"Código de cadastro de agente inválido ou cadastro de agentes desabilitado.");
        String login=c.usuario().toLowerCase(Locale.ROOT);
        String id=UUID.randomUUID().toString();
        db.execute("INSERT INTO momentcar.usuarios(id,usuario,senha,nome,perfil) VALUES (?,?,?,?,?)",
            id,login,passwords.encode(c.senha()),c.nome().trim(),c.perfil());
        return new Conta(id,login,c.nome().trim(),c.perfil());
    }
    public Usuario autenticar(Login input) {
        Usuario u=db.usuario(input.usuario().trim().toLowerCase(Locale.ROOT)).orElse(null);
        boolean valid=passwords.matches(input.senha(),u==null?dummyHash:u.senha());
        if (!valid || u==null) throw new RegraException(401,"Usuário ou senha incorretos.");
        return u;
    }
}
