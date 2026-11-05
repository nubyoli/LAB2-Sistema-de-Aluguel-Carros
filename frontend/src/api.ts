export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (method !== "GET") {
      const response = await fetch("/api/auth/csrf", {
        credentials: "same-origin",
      });
      if (!response.ok)
        throw new ApiError(
          "Não foi possível iniciar uma sessão segura.",
          response.status,
        );
      const csrf = await response.json();
      headers[csrf.headerName] = csrf.token;
    }
    const response = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: "same-origin",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 401 && !path.startsWith("/auth/"))
        window.dispatchEvent(new Event("session-expired"));
      throw new ApiError(
        error.message ||
          "Não foi possível concluir a operação. Tente novamente.",
        response.status,
      );
    }
    return response.status === 204 ? (undefined as T) : await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "Não foi possível conectar ao servidor. Verifique se o back-end está em execução.",
      0,
    );
  }
}
