import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { api } from "./api";
import type {
  ClienteDetalhe,
  Conta,
  DetalhePedido,
  Emprego,
  Pedido,
} from "./types";
import type { Data } from "./App";
import {
  Badge,
  Confirm,
  Empty,
  ErrorBox,
  Field,
  Header,
  Loading,
  date,
  money,
  perfilLabel,
  today,
} from "./components";

type Saved = (message: string, path: string) => Promise<void>;
function useResource<T>(path?: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!path);
  useEffect(() => {
    if (!path) return;
    let active = true;
    setLoading(true);
    api<T>(path)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path]);
  return { data, setData, error, loading };
}
function SaveForm({
  children,
  submit,
  back,
  label = "Salvar",
}: {
  children: ReactNode;
  submit: (data: FormData) => Promise<void>;
  back: string;
  label?: string;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await submit(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save}>
      <ErrorBox error={error} />
      <fieldset disabled={busy}>
        {children}
        <div className="form-actions">
          <button className="primary" type="submit">
            {busy ? "Salvando…" : label}
          </button>
          <a
            className={`button secondary ${busy ? "disabled" : ""}`}
            href={back}
          >
            Cancelar
          </a>
        </div>
      </fieldset>
    </form>
  );
}
export function ClientForm({
  user,
  id,
  saved,
}: {
  user: Conta;
  id?: string;
  saved: Saved;
}) {
  const resource = useResource<ClienteDetalhe>(
    id ? `/clientes/${id}` : undefined,
  );
  if (user.perfil !== "CLIENTE" || (id && user.id !== id))
    return <Empty title="Você só pode editar seu próprio cadastro." />;
  if (resource.loading) return <Loading />;
  if (resource.error) return <ErrorBox error={resource.error} />;
  return <ClientEditor user={user} detail={resource.data} saved={saved} />;
}
function ClientEditor({
  user,
  detail,
  saved,
}: {
  user: Conta;
  detail: ClienteDetalhe | null;
  saved: Saved;
}) {
  const [jobs, setJobs] = useState<Emprego[]>(detail?.empregos || []);
  const c = detail?.cliente;
  return (
    <>
      <Header
        title={c ? "Editar cadastro" : "Cadastro do cliente"}
        subtitle="Seus dados ajudam o agente a analisar a solicitação de aluguel."
      />
      <div className="form-card">
        <SaveForm
          back="#/clientes"
          label="Salvar cadastro"
          submit={async (data) => {
            const payload = {
              ...Object.fromEntries(data),
              cpf: String(data.get("cpf")).replace(/\D/g, ""),
              empregos: jobs,
            };
            await api(
              c ? `/clientes/${c.id}` : "/clientes",
              c ? "PUT" : "POST",
              payload,
            );
            await saved("Cadastro salvo com sucesso.", "/clientes");
          }}
        >
          <h2>
            <span className="step-number">01</span>Identificação
          </h2>
          <div className="form-grid">
            <Field label="RG">
              <input name="rg" defaultValue={c?.rg} required maxLength={30} />
            </Field>
            <Field label="CPF">
              <input
                name="cpf"
                defaultValue={c?.cpf}
                required
                inputMode="numeric"
                minLength={11}
                maxLength={14}
                placeholder="000.000.000-00"
              />
            </Field>
            <Field label="Nome completo">
              <input
                name="nome"
                defaultValue={c?.nome || user.nome}
                required
                maxLength={150}
                autoComplete="name"
              />
            </Field>
            <Field label="Profissão">
              <input
                name="profissao"
                defaultValue={c?.profissao}
                required
                maxLength={100}
              />
            </Field>
            <Field label="Endereço completo" full>
              <input
                name="endereco"
                defaultValue={c?.endereco}
                required
                maxLength={300}
                placeholder="Rua, número, bairro, cidade e UF"
                autoComplete="street-address"
              />
            </Field>
          </div>
          <h2>
            <span className="step-number">02</span>Entidades empregadoras e
            rendimentos
          </h2>
          <p className="muted">
            Informe até 3 fontes de renda. Este preenchimento é opcional.
          </p>
          {jobs.map((job, index) => (
            <div className="job-row" key={index}>
              <Field label={`Entidade empregadora ${index + 1}`}>
                <input
                  value={job.entidade}
                  required
                  maxLength={150}
                  onChange={(e) =>
                    setJobs(
                      jobs.map((j, i) =>
                        i === index ? { ...j, entidade: e.target.value } : j,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Rendimento mensal (R$)">
                <input
                  type="number"
                  min="0"
                  max="999999999999.99"
                  step="0.01"
                  value={job.rendimento}
                  required
                  onChange={(e) =>
                    setJobs(
                      jobs.map((j, i) =>
                        i === index
                          ? { ...j, rendimento: Number(e.target.value) }
                          : j,
                      ),
                    )
                  }
                />
              </Field>
              <button
                className="text-button remove"
                type="button"
                aria-label={`Remover entidade ${index + 1}`}
                onClick={() => setJobs(jobs.filter((_, i) => i !== index))}
              >
                Remover
              </button>
            </div>
          ))}
          <button
            type="button"
            className="secondary"
            disabled={jobs.length >= 3}
            onClick={() => setJobs([...jobs, { entidade: "", rendimento: 0 }])}
          >
            + Adicionar entidade
          </button>
          <span className="inline-note">{jobs.length} de 3 entidades</span>
        </SaveForm>
      </div>
    </>
  );
}
export function ClientView({
  user,
  id,
}: {
  user: Conta;
  id: string;
  saved: Saved;
}) {
  const { data, error, loading } = useResource<ClienteDetalhe>(
    `/clientes/${id}`,
  );
  if (loading) return <Loading />;
  if (error || !data)
    return <ErrorBox error={error || "Cliente não encontrado."} />;
  const c = data.cliente;
  return (
    <>
      <a className="back-link" href="#/clientes">
        ← Clientes
      </a>
      <Header
        title={c.nome}
        subtitle="Dados cadastrais do cliente"
        action={
          user.id === id && (
            <a className="button primary" href={`#/clientes/${id}/editar`}>
              Editar cadastro
            </a>
          )
        }
      />
      <section className="detail-card">
        <h2>Identificação</h2>
        <dl className="detail-grid">
          <div>
            <dt>RG</dt>
            <dd>{c.rg}</dd>
          </div>
          <div>
            <dt>CPF</dt>
            <dd>{c.cpf}</dd>
          </div>
          <div>
            <dt>Profissão</dt>
            <dd>{c.profissao}</dd>
          </div>
          <div>
            <dt>Endereço</dt>
            <dd>{c.endereco}</dd>
          </div>
        </dl>
      </section>
      <section className="detail-card">
        <h2>Rendimentos</h2>
        {data.empregos.length ? (
          <>
            <dl className="detail-grid">
              {data.empregos.map((j, i) => (
                <div key={i}>
                  <dt>{j.entidade}</dt>
                  <dd>{money(j.rendimento)} / mês</dd>
                </div>
              ))}
            </dl>
            <p className="income-total">
              Total mensal:{" "}
              <strong>
                {money(data.empregos.reduce((sum, j) => sum + j.rendimento, 0))}
              </strong>
            </p>
          </>
        ) : (
          <p className="muted">Nenhuma entidade empregadora informada.</p>
        )}
      </section>
    </>
  );
}
export function CarForm({ user, saved }: { user: Conta; saved: Saved }) {
  return (
    <>
      <Header
        title="Cadastrar automóvel"
        subtitle="Registre os dados do veículo para vinculá-lo a um pedido."
      />
      <div className="form-card">
        <SaveForm
          back="#/automoveis"
          label="Salvar automóvel"
          submit={async (data) => {
            await api("/automoveis", "POST", {
              ...Object.fromEntries(data),
              ano: Number(data.get("ano")),
              placa: String(data.get("placa"))
                .replace(/[^a-zA-Z0-9]/g, "")
                .toUpperCase(),
            });
            await saved("Automóvel cadastrado.", "/automoveis");
          }}
        >
          <h2>
            <span className="step-number">01</span>Identificação do automóvel
          </h2>
          <div className="form-grid">
            <Field label="Matrícula">
              <input
                name="matricula"
                required
                maxLength={40}
                placeholder="Identificação única do veículo"
              />
            </Field>
            <Field label="Ano">
              <input
                name="ano"
                type="number"
                min="1886"
                max="2100"
                required
                placeholder="2026"
              />
            </Field>
            <Field label="Marca">
              <input
                name="marca"
                required
                maxLength={80}
                placeholder="Ex.: Volkswagen"
              />
            </Field>
            <Field label="Modelo">
              <input
                name="modelo"
                required
                maxLength={100}
                placeholder="Ex.: Polo"
              />
            </Field>
            <Field label="Placa">
              <input
                name="placa"
                required
                maxLength={8}
                placeholder="ABC1D23 ou ABC-1234"
              />
            </Field>
            <Field label="Tipo de proprietário">
              <input value={perfilLabel[user.perfil]} readOnly />
            </Field>
            <Field label="Proprietário" full>
              <input value={user.nome} readOnly />
              <small>
                O veículo será registrado como propriedade da conta autenticada.
              </small>
            </Field>
          </div>
        </SaveForm>
      </div>
    </>
  );
}
export function OrderForm({
  user,
  data,
  id,
  saved,
}: {
  user: Conta;
  data: Data;
  id?: string;
  saved: Saved;
}) {
  const resource = useResource<DetalhePedido>(
    id ? `/pedidos/${id}` : undefined,
  );
  if (resource.loading) return <Loading />;
  if (resource.error) return <ErrorBox error={resource.error} />;
  if (!id && user.perfil !== "CLIENTE")
    return <Empty title="Somente clientes criam pedidos." />;
  if (!id && !data.clientes.length)
    return (
      <Empty title="Complete seu cadastro antes de continuar">
        <p>Precisamos dos seus dados para solicitar a análise financeira.</p>
        <a className="button primary" href="#/clientes/novo">
          Completar cadastro
        </a>
      </Empty>
    );
  if (
    resource.data &&
    ["CONTRATADO", "CANCELADO"].includes(resource.data.pedido.status)
  )
    return (
      <Empty title="Este pedido está encerrado">
        <a href={`#/pedidos/${id}`}>Voltar ao pedido</a>
      </Empty>
    );
  return <OrderEditor data={data} detail={resource.data} saved={saved} />;
}
function OrderEditor({
  data,
  detail,
  saved,
}: {
  data: Data;
  detail: DetalhePedido | null;
  saved: Saved;
}) {
  const p = detail?.pedido;
  const [carId, setCarId] = useState(p?.automovelId || "");
  const [credit, setCredit] = useState(!!p?.bancoId);
  const [start, setStart] = useState(p?.inicio || "");
  const cars = data.automoveis.filter(
    (a) =>
      a.proprietarioTipo !== "CLIENTE" ||
      !p ||
      a.proprietarioId === p.clienteId,
  );
  const car = cars.find((a) => a.id === carId);
  const banks = data.agentes.filter((a) => a.perfil === "BANCO");
  return (
    <>
      <Header
        title={
          p
            ? `Editar pedido · #${String(p.numero).padStart(4, "0")}`
            : "Novo pedido"
        }
        subtitle="Escolha seu automóvel e informe os dados do aluguel."
      />
      <div className="form-card">
        <SaveForm
          back={p ? `#/pedidos/${p.id}` : "#/pedidos"}
          label={p ? "Salvar alterações" : "Enviar pedido"}
          submit={async (form) => {
            if (!car) throw new Error("Selecione um automóvel.");
            const result = await api<Pedido>(
              p ? `/pedidos/${p.id}` : "/pedidos",
              p ? "PUT" : "POST",
              {
                automovelId: carId,
                agenteId: p?.agenteId || form.get("agenteId"),
                inicio: form.get("inicio"),
                fim: form.get("fim"),
                tipoContrato: car.proprietarioTipo,
                bancoId: credit ? form.get("bancoId") : null,
                revisao: p?.revisao,
              },
            );
            await saved(
              p
                ? "Pedido atualizado e enviado para nova análise."
                : "Pedido enviado para análise.",
              `/pedidos/${result.id}`,
            );
          }}
        >
          <h2>
            <span className="step-number">01</span>Automóvel e agente
            responsável
          </h2>
          <div className="form-grid">
            <Field label="Selecionar automóvel" full>
              <select
                value={carId}
                onChange={(e) => setCarId(e.target.value)}
                required
              >
                <option value="">Selecione um automóvel</option>
                {cars.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.marca} {a.modelo} · {a.placa} · {a.proprietarioNome}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Agente responsável pela análise" full>
              <select
                name="agenteId"
                defaultValue={p?.agenteId || ""}
                disabled={!!p}
                required
              >
                <option value="">Selecione uma empresa ou banco</option>
                {data.agentes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome} ({perfilLabel[a.perfil]})
                  </option>
                ))}
              </select>
              <small>
                Somente esse agente poderá avaliar e executar seu contrato.
              </small>
            </Field>
          </div>
          {!cars.length && (
            <p className="alert">
              Nenhum automóvel disponível.{" "}
              <a href="#/automoveis/novo">Cadastre seu veículo</a> ou aguarde um
              agente cadastrar a frota.
            </p>
          )}
          {!data.agentes.length && (
            <p className="alert">
              Um agente precisa se cadastrar antes de você enviar o pedido.
            </p>
          )}
          <h2>
            <span className="step-number">02</span>Período do aluguel
          </h2>
          <div className="form-grid">
            <Field label="Data de início">
              <input
                type="date"
                name="inicio"
                defaultValue={p?.inicio}
                onChange={(e) => setStart(e.target.value)}
                min={today()}
                required
              />
            </Field>
            <Field label="Data de término">
              <input
                type="date"
                name="fim"
                defaultValue={p?.fim}
                min={start || today()}
                required
              />
            </Field>
          </div>
          <h2>
            <span className="step-number">03</span>Contrato e crédito
          </h2>
          <div className="form-grid">
            <Field label="Tipo de contrato">
              <input
                readOnly
                value={
                  car
                    ? `Propriedade de ${perfilLabel[car.proprietarioTipo].toLowerCase()}`
                    : "Selecione um automóvel"
                }
              />
              <small>Definido conforme o proprietário do veículo.</small>
            </Field>
            <div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={credit}
                  onChange={(e) => setCredit(e.target.checked)}
                />
                Associar contrato de crédito
              </label>
              {credit && (
                <Field label="Banco agente">
                  <select
                    name="bancoId"
                    defaultValue={p?.bancoId || ""}
                    required
                  >
                    <option value="">Selecione um banco</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nome}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          </div>
          {credit && (
            <p className="muted">
              A referência do crédito já concedido será registrada pelo agente
              ao executar o contrato. Este sistema não concede crédito bancário.
            </p>
          )}
          {p && (
            <p className="alert">
              Salvar alterações invalida o parecer atual e retorna o pedido para
              análise.
            </p>
          )}
        </SaveForm>
      </div>
    </>
  );
}
export function OrderDetail({
  user,
  id,
  saved,
}: {
  user: Conta;
  id: string;
  saved: Saved;
}) {
  const resource = useResource<DetalhePedido>(`/pedidos/${id}`);
  const [cancel, setCancel] = useState(false);
  const [execute, setExecute] = useState(false);
  const [reference, setReference] = useState("");
  if (resource.loading) return <Loading />;
  if (resource.error || !resource.data)
    return <ErrorBox error={resource.error || "Pedido não encontrado."} />;
  const { pedido: p, automovel: a, avaliacoes, contrato } = resource.data;
  const open = !["CANCELADO", "CONTRATADO"].includes(p.status);
  const client = user.perfil === "CLIENTE";
  async function refresh(message: string) {
    resource.setData(await api<DetalhePedido>(`/pedidos/${id}`));
    await saved(message, `/pedidos/${id}`);
  }
  const phase =
    p.status === "CONTRATADO"
      ? 3
      : p.status === "APROVADO" || p.status === "REPROVADO"
        ? 2
        : 1;
  return (
    <>
      <a className="back-link" href="#/pedidos">
        ← Voltar aos pedidos
      </a>
      <Header
        title={`Pedido #${String(p.numero).padStart(4, "0")}`}
        subtitle={`Solicitado em ${date(p.criadoEm)} · ${p.clienteNome}`}
        action={<Badge status={p.status} />}
      />
      <section className="detail-card">
        <h2>Dados do pedido</h2>
        <dl className="detail-grid">
          <div>
            <dt>Cliente</dt>
            <dd>
              {client ? (
                p.clienteNome
              ) : (
                <a href={`#/clientes/${p.clienteId}`}>{p.clienteNome} ↗</a>
              )}
            </dd>
          </div>
          <div>
            <dt>Período</dt>
            <dd>
              {date(p.inicio)} a {date(p.fim)}
            </dd>
          </div>
          <div>
            <dt>Agente responsável</dt>
            <dd>{p.agenteNome}</dd>
          </div>
          <div>
            <dt>Tipo de contrato</dt>
            <dd>Propriedade de {perfilLabel[p.tipoContrato].toLowerCase()}</dd>
          </div>
          <div>
            <dt>Crédito associado</dt>
            <dd>{p.bancoNome || "Sem contrato de crédito"}</dd>
          </div>
          <div>
            <dt>Revisão</dt>
            <dd>{p.revisao}</dd>
          </div>
        </dl>
      </section>
      <section className="detail-card">
        <h2>Automóvel</h2>
        <div className="car-summary">
          <div className="car-symbol" aria-hidden="true">
            ↗
          </div>
          <div>
            <h3>
              {a.marca} {a.modelo}
            </h3>
            <span className="muted">
              {a.ano} · Matrícula {a.matricula}
            </span>
          </div>
          <span className="plate">{a.placa}</span>
        </div>
        <p className="muted">
          Proprietário: {a.proprietarioNome} ({perfilLabel[a.proprietarioTipo]})
        </p>
      </section>
      <section className="detail-card">
        <h2>Acompanhamento do pedido</h2>
        {p.status === "CANCELADO" ? (
          <p className="alert">
            Pedido cancelado pelo cliente. Não pode ser alterado ou contratado.
          </p>
        ) : (
          <ol className="timeline">
            {[
              "Introduzido",
              "Análise financeira",
              p.status === "REPROVADO"
                ? "Parecer negativo"
                : "Parecer positivo",
              "Contrato",
            ].map((label, i) => (
              <li key={i} className={i <= phase ? "complete" : ""}>
                <span>{i < phase ? "✓" : i + 1}</span>
                <strong>{label}</strong>
                <small>
                  {i < phase
                    ? "Concluído"
                    : i === phase
                      ? p.status === "CONTRATADO"
                        ? "Executado"
                        : "Etapa atual"
                      : "Pendente"}
                </small>
              </li>
            ))}
          </ol>
        )}
      </section>
      {!!avaliacoes.length && (
        <section className="detail-card">
          <h2>Histórico de pareceres</h2>
          {avaliacoes.map((v) => (
            <article className="opinion" key={v.id}>
              <div>
                <strong>
                  {v.aprovado ? "Parecer positivo" : "Parecer negativo"}
                </strong>
                <span>
                  {date(v.criadoEm)} · Revisão avaliada {v.revisao}
                </span>
              </div>
              <p>{v.parecer}</p>
              <small>{v.agenteNome}</small>
            </article>
          ))}
        </section>
      )}
      {!client && open && (
        <section className="detail-card">
          <h2>Avaliação financeira</h2>
          <p className="muted">
            Consulte os dados e rendimentos do cliente antes de registrar seu
            parecer.
          </p>
          <SaveForm
            back="#/pedidos"
            label="Registrar parecer"
            submit={async (form) => {
              await api(`/pedidos/${id}/avaliacoes`, "POST", {
                aprovado: form.get("aprovado") === "true",
                parecer: form.get("parecer"),
                revisao: p.revisao,
              });
              await refresh("Parecer registrado.");
            }}
          >
            <div className="form-grid">
              <Field label="Resultado">
                <select name="aprovado" required>
                  <option value="">Selecione o parecer</option>
                  <option value="true">Positivo — aprovar</option>
                  <option value="false">Negativo — reprovar</option>
                </select>
              </Field>
              <Field label="Justificativa" full>
                <textarea
                  name="parecer"
                  required
                  maxLength={2000}
                  rows={3}
                  placeholder="Descreva a análise realizada"
                />
              </Field>
            </div>
          </SaveForm>
        </section>
      )}
      {contrato && (
        <section className="detail-card contract-card">
          <span className="eyebrow">CONTRATAÇÃO CONCLUÍDA</span>
          <h2>Seu contrato foi executado.</h2>
          <p>
            Formalizado em {date(contrato.criadoEm)} pelo agente {p.agenteNome}.
          </p>
          <dl>
            <dt>Identificador do contrato</dt>
            <dd className="mono">{contrato.id}</dd>
            {contrato.creditoReferencia && (
              <>
                <dt>Referência do crédito concedido</dt>
                <dd>{contrato.creditoReferencia}</dd>
              </>
            )}
          </dl>
          <button className="secondary" onClick={() => window.print()}>
            Imprimir comprovante
          </button>
        </section>
      )}
      <div className="actions">
        {open && (
          <a className="button secondary" href={`#/pedidos/${id}/editar`}>
            Editar pedido
          </a>
        )}
        {client && open && (
          <button className="danger-outline" onClick={() => setCancel(true)}>
            Cancelar pedido
          </button>
        )}
        {!client && p.status === "APROVADO" && (
          <button className="primary" onClick={() => setExecute(true)}>
            Executar contrato →
          </button>
        )}
      </div>
      {cancel && (
        <Confirm
          title="Cancelar pedido?"
          label="Cancelar pedido"
          close={() => setCancel(false)}
          confirm={async () => {
            await api(`/pedidos/${id}/cancelar`, "POST");
            await refresh("Pedido cancelado.");
          }}
        >
          <p>
            O pedido #{String(p.numero).padStart(4, "0")} será marcado como
            cancelado. Essa ação não pode ser desfeita.
          </p>
        </Confirm>
      )}
      {execute && (
        <Confirm
          title="Executar contrato de aluguel?"
          label="Confirmar contrato"
          close={() => setExecute(false)}
          confirm={async () => {
            await api(`/pedidos/${id}/contrato`, "POST", {
              revisao: p.revisao,
              creditoReferencia: p.bancoId ? reference : null,
            });
            await refresh("Contrato executado.");
          }}
        >
          <p>
            O pedido aprovado será formalizado e não poderá mais ser editado ou
            cancelado.
          </p>
          {p.bancoId && (
            <Field label={`Referência do crédito concedido por ${p.bancoNome}`}>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={100}
              />
              <small>
                Informe o identificador do contrato de crédito já concedido pelo
                banco.
              </small>
            </Field>
          )}
        </Confirm>
      )}
    </>
  );
}
