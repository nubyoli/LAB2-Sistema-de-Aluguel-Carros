import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";
import type { Automovel, Cliente, Conta, Pedido } from "./types";
import Auth from "./Auth";
import {
  Confirm,
  Empty,
  ErrorBox,
  Header,
  Icon,
  Loading,
  navigate,
  perfilLabel,
} from "./components";
import {
  ClientForm,
  ClientView,
  CarForm,
  OrderForm,
  OrderDetail,
} from "./pages";
import { Orders, ClientList, CarList, NewOrder } from "./lists";
import "./App.css";
export interface Data {
  pedidos: Pedido[];
  clientes: Cliente[];
  automoveis: Automovel[];
  agentes: Conta[];
}
const initial: Data = {
  pedidos: [],
  clientes: [],
  automoveis: [],
  agentes: [],
};

export default function App() {
  const [user, setUser] = useState<Conta | null>(null);
  const [boot, setBoot] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Data>(initial);
  const [path, setPath] = useState(location.hash.slice(1) || "/dashboard");
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => { window.scrollTo(0, 0); }, [path]);
  useEffect(() => {
    const route = () => setPath(location.hash.slice(1) || "/dashboard");
    const expired = () => {
      setUser(null);
      setData(initial);
      setMessage("Sua sessão expirou. Entre novamente.");
      navigate("/dashboard");
    };
    window.addEventListener("hashchange", route);
    window.addEventListener("session-expired", expired);
    api<Conta>("/auth/me")
      .then(setUser)
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) setMessage(e.message);
      })
      .finally(() => setBoot(false));
    return () => {
      window.removeEventListener("hashchange", route);
      window.removeEventListener("session-expired", expired);
    };
  }, []);
  const reload = useCallback(async () => {
    const [pedidos, clientes, automoveis, agentes] = await Promise.all([
      api<Pedido[]>("/pedidos"),
      api<Cliente[]>("/clientes"),
      api<Automovel[]>("/automoveis"),
      api<Conta[]>("/agentes"),
    ]);
    setData({ pedidos, clientes, automoveis, agentes });
  }, []);
  useEffect(() => {
    if (user) {
      setLoading(true);
      setError("");
      reload()
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [user, reload]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  async function saved(text: string, route: string) {
    await reload();
    setToast(text);
    navigate(route);
  }
  if (boot) return <Loading />;
  if (!user)
    return (
      <Auth
        message={message}
        onLogin={(u) => {
          setUser(u);
          setMessage("");
          navigate("/dashboard");
        }}
      />
    );
  const client = user.perfil === "CLIENTE";
  const active = path.split("/")[1];
  const links = [
    ["dashboard", "Visão geral"],
    ["pedidos", client ? "Meus pedidos" : "Pedidos recebidos"],
    ...(client ? [["novo-pedido", "Novo pedido"]] : []),
    ["clientes", client ? "Meu cadastro" : "Clientes"],
    ["automoveis", "Automóveis"],
  ];
  function page() {
    if (path === "/novo-pedido")
      return <OrderForm user={user!} data={data} saved={saved} />;
    if (/^\/pedidos\/[^/]+\/editar$/.test(path))
      return (
        <OrderForm
          user={user!}
          data={data}
          id={path.split("/")[2]}
          saved={saved}
        />
      );
    if (/^\/pedidos\/[^/]+$/.test(path))
      return <OrderDetail user={user!} id={path.split("/")[2]} saved={saved} />;
    if (path === "/clientes/novo" || /^\/clientes\/[^/]+\/editar$/.test(path))
      return (
        <ClientForm
          user={user!}
          id={path === "/clientes/novo" ? undefined : path.split("/")[2]}
          saved={saved}
        />
      );
    if (/^\/clientes\/[^/]+$/.test(path))
      return <ClientView user={user!} id={path.split("/")[2]} saved={saved} />;
    if (path === "/automoveis/novo")
      return <CarForm user={user!} saved={saved} />;
    if (path === "/clientes")
      return <ClientList user={user!} data={data} saved={saved} />;
    if (path === "/automoveis") return <CarList data={data} />;
    if (path === "/pedidos")
      return (
        <>
          <Header
            title={client ? "Meus pedidos" : "Pedidos recebidos"}
            subtitle="Consulte solicitações e acompanhe cada etapa do aluguel."
            action={client && <NewOrder />}
          />
          <Orders data={data.pedidos} />
        </>
      );
    if (path !== "/dashboard")
      return (
        <Empty title="Página não encontrada">
          <a href="#/dashboard">Voltar à visão geral</a>
        </Empty>
      );
    return (
      <>
        <div className="breadcrumb">SEU ESPAÇO / VISÃO GERAL</div>
        <Header
          title={`Olá, ${user!.nome.split(" ")[0]}.`}
          subtitle="Seu próximo caminho começa por aqui. Confira seus aluguéis."
          action={client && <NewOrder />}
        />
        {client && !data.clientes.length && (
          <div className="onboarding">
            <span className="onboarding-icon">
              <Icon name="clientes" />
            </span>
            <div>
              <strong>Vamos completar seu cadastro?</strong>
              <p>Informe seus dados pessoais para fazer o primeiro pedido.</p>
            </div>
            <a className="button secondary" href="#/clientes/novo">
              Completar cadastro ↗
            </a>
          </div>
        )}
        <div className="stats">
          {[
            [
              "EM_ANALISE",
              "Em análise",
              "Aguardando avaliação financeira",
              "◷",
            ],
            ["APROVADO", "Aprovados", "Prontos para contratação", "↗"],
            ["CONTRATADO", "Contratados", "Jornadas confirmadas", "✓"],
            ["CANCELADO", "Cancelados", "Cancelamentos registrados", "−"],
          ].map(([status, title, caption, symbol]) => (
            <section className="stat" key={status}>
              <div>
                <span>{title}</span>
                <i>{symbol}</i>
              </div>
              <strong>
                {String(
                  data.pedidos.filter((p) => p.status === status).length,
                ).padStart(2, "0")}
              </strong>
              <small>{caption}</small>
            </section>
          ))}
        </div>
        <div className="section-heading">
          <div>
            <h2>Pedidos recentes</h2>
            <p>As últimas movimentações dos seus aluguéis.</p>
          </div>
          <a className="text-link" href="#/pedidos">
            Ver todos os pedidos →
          </a>
        </div>
        <Orders data={data.pedidos.slice(0, 5)} compact />
        <div className="journey">
          <div>
            <span className="eyebrow">SIMPLES DO INÍCIO AO FIM</span>
            <h2>Cada etapa, um passo mais perto.</h2>
          </div>
          <ol>
            <li>
              <b>01</b>
              <span>
                Faça seu pedido<small>Escolha carro e período</small>
              </span>
            </li>
            <li>
              <b>02</b>
              <span>
                Acompanhe a análise<small>Avaliação pelo agente</small>
              </span>
            </li>
            <li>
              <b>03</b>
              <span>
                Contrato confirmado<small>Tudo pronto para seguir</small>
              </span>
            </li>
          </ol>
        </div>
      </>
    );
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#/dashboard">
          <span className="brand-mark">
            <Icon name="automoveis" />
          </span>
          moment<span>car</span>
          <i>®</i>
        </a>
        <span className="nav-label">PRINCIPAL</span>
        <nav>
          {links.map(([key, label]) => (
            <a
              href={`#/${key}`}
              key={key}
              className={active === key ? "active" : ""}
            >
              <Icon name={key === "novo-pedido" ? "plus" : key} />
              {label}
              {active === key && <span className="nav-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span>Seu caminho, organizado.</span>
            <small>Pedidos e contratos sempre à mão.</small>
          </div>
          <div className="profile">
            <div className="avatar">{user.nome.slice(0, 2).toUpperCase()}</div>
            <div>
              <strong>{user.nome}</strong>
              <small>{perfilLabel[user.perfil]}</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-layout">
        <div className="topbar">
          <span>Sistema de aluguel de carros</span>
          <div>
            <span className="profile-tag">{perfilLabel[user.perfil]}</span>
            <button className="logout" onClick={() => setConfirmLogout(true)}>
              <Icon name="logout" />
              Sair
            </button>
          </div>
        </div>
        <main key={path}>
          {loading ? (
            <Loading />
          ) : error ? (
            <>
              <ErrorBox error={error} />
              <button
                className="secondary"
                onClick={() => {
                  setLoading(true);
                  reload()
                    .then(() => setError(""))
                    .catch((e) => setError(e.message))
                    .finally(() => setLoading(false));
                }}
              >
                Tentar novamente
              </button>
            </>
          ) : (
            page()
          )}
        </main>
        <footer>
          MomentCar <span>Alugue com clareza. Siga com tranquilidade.</span>
        </footer>
      </div>
      {toast && (
        <div role="status" className="toast">
          ✓ {toast}
        </div>
      )}
      {confirmLogout && (
        <Confirm
          title="Sair da sua conta?"
          label="Sair"
          close={() => setConfirmLogout(false)}
          confirm={async () => {
            await api("/auth/logout", "POST");
            setUser(null);
            setData(initial);
            navigate("/dashboard");
          }}
        >
          <p>Você poderá acessar seus pedidos novamente ao entrar.</p>
        </Confirm>
      )}
    </div>
  );
}
