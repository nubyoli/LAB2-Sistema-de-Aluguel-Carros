import { useState } from "react";
import { api } from "./api";
import type { Cliente, Conta, Pedido } from "./types";
import type { Data } from "./App";
import {
  Badge,
  Confirm,
  Empty,
  Header,
  Icon,
  date,
  perfilLabel,
  labels,
} from "./components";
export function NewOrder() {
  return (
    <a href="#/novo-pedido" className="button primary">
      <Icon name="plus" />
      Novo pedido
    </a>
  );
}
export function Orders({
  data,
  compact,
}: {
  data: Pedido[];
  compact?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const filtered = data.filter(
    (p) =>
      (!status || p.status === status) &&
      `${p.numero} ${p.automovelNome} ${p.placa} ${p.clienteNome}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section className="table-panel">
      {!compact && (
        <div className="filters">
          <label>
            Buscar pedido
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nº do pedido, automóvel ou cliente"
            />
          </label>
          <label>
            Filtrar por status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos os status</option>
              {Object.entries(labels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {!filtered.length ? (
        <Empty
          title={
            data.length
              ? "Nenhum pedido encontrado"
              : "Seu próximo caminho ainda está por vir"
          }
        >
          <p>
            {data.length
              ? "Experimente outros filtros."
              : "Os pedidos aparecerão aqui assim que forem criados."}
          </p>
        </Empty>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Automóvel</th>
                <th>Período</th>
                <th>Status</th>
                <th className="right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <a className="order-number" href={`#/pedidos/${p.id}`}>
                      #{String(p.numero).padStart(4, "0")}
                    </a>
                    <small>{date(p.criadoEm)}</small>
                  </td>
                  <td>
                    <strong>{p.automovelNome}</strong>
                    <small>{p.placa}</small>
                  </td>
                  <td>
                    {date(p.inicio)}
                    <small>até {date(p.fim)}</small>
                  </td>
                  <td>
                    <Badge status={p.status} />
                  </td>
                  <td className="right">
                    <a className="row-link" href={`#/pedidos/${p.id}`}>
                      Ver pedido ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="table-footer">
        {filtered.length} pedidos {compact ? "recentes" : "encontrados"}
        <span>MomentCar / Aluguéis</span>
      </div>
    </section>
  );
}
export function ClientList({
  user,
  data,
  saved,
}: {
  user: Conta;
  data: Data;
  saved: (text: string, path: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [remove, setRemove] = useState<Cliente | null>(null);
  const clients = data.clientes.filter((c) =>
    `${c.nome} ${c.cpf}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <Header
        title={user.perfil === "CLIENTE" ? "Meu cadastro" : "Clientes"}
        subtitle={
          user.perfil === "CLIENTE"
            ? "Mantenha seus dados de identificação e renda atualizados."
            : "Consulte os clientes dos pedidos direcionados a você."
        }
        action={
          user.perfil === "CLIENTE" &&
          !data.clientes.length && (
            <a className="button primary" href="#/clientes/novo">
              Completar cadastro
            </a>
          )
        }
      />
      <section className="table-panel">
        <div className="filters">
          <label>
            Buscar cliente
            <input
              placeholder="Nome ou CPF"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        {!clients.length ? (
          <Empty title="Nenhum cliente encontrado">
            <p>
              {user.perfil === "CLIENTE"
                ? "Complete seus dados para solicitar um aluguel."
                : "Os clientes aparecem quando um pedido é direcionado a você."}
            </p>
          </Empty>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Profissão</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.nome}</strong>
                    </td>
                    <td>
                      {c.cpf.replace(
                        /(\d{3})(\d{3})(\d{3})(\d{2})/,
                        "$1.$2.$3-$4",
                      )}
                    </td>
                    <td>{c.profissao}</td>
                    <td>
                      <div className="row-actions">
                        <a href={`#/clientes/${c.id}`}>Ver</a>
                        {user.id === c.id && (
                          <>
                            <a href={`#/clientes/${c.id}/editar`}>Editar</a>
                            <button onClick={() => setRemove(c)}>
                              Excluir
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {remove && (
        <Confirm
          title="Excluir cadastro do cliente?"
          label="Excluir cadastro"
          close={() => setRemove(null)}
          confirm={async () => {
            await api(`/clientes/${remove.id}`, "DELETE");
            await saved("Cadastro excluído.", "/clientes");
          }}
        >
          <p>
            O cadastro de {remove.nome} será excluído. Clientes com pedidos
            vinculados não podem ser excluídos. Sua conta de acesso será
            mantida.
          </p>
        </Confirm>
      )}
    </>
  );
}
export function CarList({ data }: { data: Data }) {
  const [search, setSearch] = useState("");
  const cars = data.automoveis.filter((c) =>
    `${c.marca} ${c.modelo} ${c.placa}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <Header
        title="Automóveis"
        subtitle="Consulte os veículos e registre um automóvel de sua propriedade."
        action={
          <a className="button primary" href="#/automoveis/novo">
            <Icon name="plus" />
            Cadastrar automóvel
          </a>
        }
      />
      <section className="table-panel">
        <div className="filters">
          <label>
            Buscar automóvel
            <input
              placeholder="Marca, modelo ou placa"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        {!cars.length ? (
          <Empty title="Nenhum automóvel encontrado">
            <p>Cadastre seu automóvel ou aguarde os veículos dos agentes.</p>
          </Empty>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Automóvel</th>
                  <th>Matrícula</th>
                  <th>Placa</th>
                  <th>Proprietário</th>
                </tr>
              </thead>
              <tbody>
                {cars.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>
                        {c.marca} {c.modelo}
                      </strong>
                      <small>{c.ano}</small>
                    </td>
                    <td>{c.matricula}</td>
                    <td>
                      <span className="plate">{c.placa}</span>
                    </td>
                    <td>
                      {c.proprietarioNome}
                      <small>{perfilLabel[c.proprietarioTipo]}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
