import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Status } from "./types";
export const labels: Record<Status, string> = {
  EM_ANALISE: "Em análise",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  CANCELADO: "Cancelado",
  CONTRATADO: "Contratado",
};
export const perfilLabel = {
  CLIENTE: "Cliente",
  EMPRESA: "Empresa",
  BANCO: "Banco",
};
export function navigate(path: string) {
  window.location.hash = path;
}
export function date(value: string) {
  return new Date(
    value.length === 10 ? `${value}T12:00:00` : value,
  ).toLocaleDateString("pt-BR");
}
export function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function Badge({ status }: { status: Status }) {
  return (
    <span className={`badge ${status.toLowerCase()}`}>
      <i />
      {labels[status]}
    </span>
  );
}
export function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`field ${full ? "full" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Header({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </header>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon" aria-hidden="true">
        ↗
      </span>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function ErrorBox({ error }: { error: string }) {
  return error ? (
    <div className="alert error" role="alert">
      {error}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Carregando…
    </div>
  );
}
export function Confirm({
  title,
  children,
  confirm,
  close,
  label,
}: {
  title: string;
  children: ReactNode;
  confirm: () => Promise<void>;
  close: () => void;
  label: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
    >
      <div className="modal-icon" aria-hidden="true">
        !
      </div>
      <h2 id="confirm-title">{title}</h2>
      <div className="muted">{children}</div>
      <ErrorBox error={error} />
      <div className="actions">
        <button className="secondary" disabled={busy} onClick={close} autoFocus>
          Voltar
        </button>
        <button
          className="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await confirm();
              close();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Aguarde…" : label}
        </button>
      </div>
    </dialog>
  );
}
export function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    pedidos: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 3h6v4H9zM9 12h6M9 16h4" />
      </>
    ),
    clientes: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    automoveis: (
      <>
        <path d="m5 6-2 7v6h18v-6l-2-7ZM3 13h18M7 6h10M6 19v2M18 19v2M6 16h2M16 16h2" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    logout: (
      <>
        <path d="M9 4H4v16h5M10 12h11m-5-5 5 5-5 5" />
      </>
    ),
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.pedidos}
    </svg>
  );
}
