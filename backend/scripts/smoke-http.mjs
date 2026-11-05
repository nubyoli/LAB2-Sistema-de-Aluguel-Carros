// Teste HTTP com dados sintéticos. Execute somente contra uma instância de teste.
// Uso: SMOKE_API_URL=http://127.0.0.1:5173/api SMOKE_AGENT_CODE=... node scripts/smoke-http.mjs
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.SMOKE_API_URL;
const code = process.env.SMOKE_AGENT_CODE;
if (!base || !code) throw new Error('Defina SMOKE_API_URL e SMOKE_AGENT_CODE para uma instância descartável.');
const suffix = randomUUID().slice(0, 8);
const password = process.env.SMOKE_PASSWORD || randomUUID();
function client() {
  let cookies = {};
  async function send(path, method = 'GET', body) {
    let headers = { 'Content-Type': 'application/json' };
    if (method !== 'GET') {
      const csrf = await send('/auth/csrf');
      headers[csrf.headerName] = csrf.token;
    }
    headers.Cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    const response = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(';')[0]; const pos = pair.indexOf('=');
      cookies[pair.slice(0, pos)] = pair.slice(pos + 1);
    }
    const data = response.status === 204 ? null : await response.json();
    assert(response.ok, `${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
    return data;
  }
  return send;
}
const agent = client(); const customer = client();
const agentLogin = `http-agente-${suffix}`; const customerLogin = `http-cliente-${suffix}`;
await agent('/auth/cadastro', 'POST', { usuario: agentLogin, senha: password, nome: 'Agente HTTP de Teste', perfil: 'EMPRESA', codigoAgente: code });
const a = await agent('/auth/login', 'POST', { usuario: agentLogin, senha: password });
await customer('/auth/cadastro', 'POST', { usuario: customerLogin, senha: password, nome: 'Cliente HTTP de Teste', perfil: 'CLIENTE' });
await customer('/auth/login', 'POST', { usuario: customerLogin, senha: password });
// CPF sintético com dígitos verificadores, diferente a cada execução.
const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
for (let size = 9; size <= 10; size++) {
  const value = (digits.reduce((sum, n, i) => sum + n * (size + 1 - i), 0) * 10) % 11;
  digits.push(value === 10 ? 0 : value);
}
await customer('/clientes', 'POST', { rg: `RG-${suffix}`, cpf: digits.join(''), nome: 'Cliente HTTP de Teste', endereco: 'Endereço sintético', profissao: 'Teste', empregos: [{ entidade: 'Empregador de teste', rendimento: 3500 }] });
const plate = 'TST' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
const auto = await agent('/automoveis', 'POST', { matricula: suffix, ano: 2026, marca: 'Teste', modelo: 'HTTP', placa: plate });
const start = new Date(); start.setDate(start.getDate() + 30);
const end = new Date(start); end.setDate(end.getDate() + 5);
let order = await customer('/pedidos', 'POST', { automovelId: auto.id, agenteId: a.id, inicio: start.toISOString().slice(0, 10), fim: end.toISOString().slice(0, 10), tipoContrato: 'EMPRESA', bancoId: null });
if (process.env.SMOKE_STOP_AT_ORDER === 'true') {
  console.log(JSON.stringify({ result: 'Pedido pronto para teste manual', agentLogin, customerLogin, orderId: order.id }));
  process.exit(0);
}
order = await agent(`/pedidos/${order.id}/avaliacoes`, 'POST', { aprovado: true, parecer: 'Parecer sintético para validação HTTP.', revisao: order.revisao });
assert.equal(order.status, 'APROVADO');
const contract = await agent(`/pedidos/${order.id}/contrato`, 'POST', { revisao: order.revisao, creditoReferencia: null });
assert.equal(contract.pedido.status, 'CONTRATADO');
const detail = await customer(`/pedidos/${order.id}`);
assert.equal(detail.avaliacoes.length, 1);
assert.ok(detail.contrato.id);
console.log(JSON.stringify({ result: 'Fluxo HTTP completo OK', agentLogin, customerLogin, orderId: order.id }));
