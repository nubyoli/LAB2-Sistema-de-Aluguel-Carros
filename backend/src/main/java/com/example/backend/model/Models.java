package com.example.backend.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public final class Models {
    private Models() {}
    public record Usuario(String id, String usuario, String senha, String nome, String perfil) {
        public boolean cliente() { return perfil.equals("CLIENTE"); }
        public Conta conta() { return new Conta(id, usuario, nome, perfil); }
    }
    public record Conta(String id, String usuario, String nome, String perfil) {}
    public record Cliente(String id, String rg, String cpf, String nome, String endereco, String profissao) {}
    public record Emprego(String entidade, BigDecimal rendimento) {}
    public record Automovel(String id, String matricula, int ano, String marca, String modelo,
        String placa, String proprietarioId, String proprietarioNome, String proprietarioTipo) {}
    public record Pedido(String id, long numero, String clienteId, String clienteNome, String agenteId,
        String agenteNome, String automovelId, String automovelNome, String placa,
        LocalDate inicio, LocalDate fim, String tipoContrato, String bancoId, String bancoNome,
        String status, int revisao, LocalDateTime criadoEm) {}
    public record Avaliacao(String id, String agenteNome, int revisao, boolean aprovado, String parecer, LocalDateTime criadoEm) {}
    public record Contrato(String id, String pedidoId, String agenteId, String bancoId, String creditoReferencia, LocalDateTime criadoEm) {}
}
