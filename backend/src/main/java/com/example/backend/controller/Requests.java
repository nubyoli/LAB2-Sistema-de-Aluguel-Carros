package com.example.backend.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class Requests {
    private Requests() {}
    public record Cadastro(@NotBlank @Pattern(regexp="[a-zA-Z0-9._-]{3,80}") String usuario,
        @NotBlank @Size(min=8,max=60) String senha, @NotBlank @Size(max=150) String nome,
        @NotNull @Pattern(regexp="CLIENTE|EMPRESA|BANCO") String perfil, String codigoAgente) {}
    public record Login(@NotBlank String usuario, @NotBlank @Size(max=60) String senha) {}
    public record Renda(@NotBlank @Size(max=150) String entidade,
        @NotNull @DecimalMin("0.00") @Digits(integer=12,fraction=2) BigDecimal rendimento) {}
    public record ClienteInput(@NotBlank @Size(max=30) String rg,
        @NotBlank @Pattern(regexp="[0-9]{11}",message="deve conter 11 números") String cpf,
        @NotBlank @Size(max=150) String nome, @NotBlank @Size(max=300) String endereco,
        @NotBlank @Size(max=100) String profissao, @NotNull @Size(max=3) List<@NotNull @Valid Renda> empregos) {}
    public record AutomovelInput(@NotBlank @Size(max=40) String matricula, @Min(1886) @Max(2100) int ano,
        @NotBlank @Size(max=80) String marca, @NotBlank @Size(max=100) String modelo,
        @NotBlank @Pattern(regexp="[A-Z]{3}[0-9][A-Z0-9][0-9]{2}",message="deve seguir ABC1234 ou ABC1D23") String placa) {}
    public record PedidoInput(@NotBlank String automovelId, @NotBlank String agenteId,
        @NotNull LocalDate inicio, @NotNull LocalDate fim,
        @NotNull @Pattern(regexp="CLIENTE|EMPRESA|BANCO") String tipoContrato, String bancoId, Integer revisao) {}
    public record Parecer(@NotNull Boolean aprovado, @NotBlank @Size(max=2000) String parecer, @NotNull Integer revisao) {}
    public record Executar(@Size(max=100) String creditoReferencia, @NotNull Integer revisao) {}
}
