import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "./api";
import type { Conta, Perfil } from "./types";
import { ErrorBox, Field, Icon } from "./components";
export default function Auth({
  onLogin,
  message,
}: {
  onLogin: (user: Conta) => void;
  message: string;
}) {
  const [register, setRegister] = useState(false);
  const [perfil, setPerfil] = useState<Perfil>("CLIENTE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (register) await api("/auth/cadastro", "POST", { ...data, perfil });
      onLogin(
        await api<Conta>("/auth/login", "POST", {
          usuario: data.usuario,
          senha: data.senha,
        }),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <a className="brand" href="#/dashboard">
          <span className="brand-mark">
            <Icon name="automoveis" />
          </span>
          moment<span>car</span>
          <i>®</i>
        </a>
        <div>
          <span className="eyebrow">SEU PRÓXIMO CAMINHO</span>
          <h1>
            Menos burocracia.
            <br />
            Mais movimento.
          </h1>
          <p>
            Do primeiro pedido ao contrato, acompanhe cada etapa do seu aluguel
            em um só lugar.
          </p>
          <div className="road-art" aria-hidden="true">
            <div className="road-line" />
            <span>01</span>
            <span>02</span>
            <span>03</span>
          </div>
          <div className="auth-steps">
            <span>Escolha seu carro</span>
            <span>Acompanhe a análise</span>
            <span>Comece sua jornada</span>
          </div>
        </div>
        <small>MomentCar · Sistema de aluguel de carros</small>
      </section>
      <section className="auth-form">
        <div className="auth-form-inner">
          <span className="eyebrow">BEM-VINDO AO MOMENTCAR</span>
          <h2>{register ? "Crie sua conta" : "Bom ter você por aqui."}</h2>
          <p className="muted">
            {register
              ? "Cadastre seu acesso para começar."
              : "Entre para gerenciar seus pedidos e contratos."}
          </p>
          {message && <div className="alert">{message}</div>}
          <ErrorBox error={error} />
          <form onSubmit={submit}>
            <fieldset disabled={busy}>
              {register && (
                <>
                  <Field label="Nome completo ou razão social">
                    <input
                      name="nome"
                      required
                      maxLength={150}
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="Tipo de conta">
                    <select
                      value={perfil}
                      onChange={(e) => setPerfil(e.target.value as Perfil)}
                    >
                      <option value="CLIENTE">Cliente — pessoa física</option>
                      <option value="EMPRESA">Agente — empresa</option>
                      <option value="BANCO">Agente — banco</option>
                    </select>
                  </Field>
                </>
              )}
              <Field label="Usuário">
                <input
                  name="usuario"
                  placeholder="seu.usuario"
                  required
                  minLength={3}
                  maxLength={80}
                  pattern="[a-zA-Z0-9._\-]{3,80}"
                  autoComplete="username"
                />
              </Field>
              <Field label="Senha">
                <input
                  name="senha"
                  type="password"
                  required
                  minLength={register ? 8 : 1}
                  maxLength={60}
                  placeholder={
                    register ? "No mínimo 8 caracteres" : "Sua senha"
                  }
                  autoComplete={register ? "new-password" : "current-password"}
                />
              </Field>
              {register && perfil !== "CLIENTE" && (
                <Field label="Código de cadastro de agente">
                  <input
                    name="codigoAgente"
                    type="password"
                    required
                    autoComplete="off"
                  />
                  <small>Fornecido pelo responsável pelo sistema.</small>
                </Field>
              )}
              <button className="primary wide" type="submit">
                {busy
                  ? "Aguarde…"
                  : register
                    ? "Criar conta e entrar →"
                    : "Entrar na minha conta →"}
              </button>
            </fieldset>
          </form>
          <p className="auth-switch">
            {register ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {register ? "Entrar" : "Cadastre-se"}
            </button>
          </p>
          <p className="auth-note">
            Acesso seguro para clientes, empresas e bancos.
          </p>
        </div>
      </section>
    </div>
  );
}
