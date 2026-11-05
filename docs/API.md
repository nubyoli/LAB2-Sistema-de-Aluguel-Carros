# API REST

Base: `/api`. Requisições e respostas JSON. Datas de aluguel: `YYYY-MM-DD`. Identificadores de entidades são UUIDs; `numero` é o número sequencial exibido ao usuário.

## Autenticação e sessão

Antes de qualquer POST, PUT ou DELETE, faça `GET /api/auth/csrf`, preserve o cookie de sessão e envie o valor `token` no cabeçalho indicado por `headerName`. O login renova o identificador da sessão e invalida o token CSRF anterior; busque um novo token depois dele. O front já faz isso automaticamente. O cookie `JSESSIONID` é HttpOnly e não é armazenado no localStorage.

| Método | Rota | Finalidade |
|---|---|---|
| GET | /health | Verificar se a aplicação está respondendo |
| GET | /auth/csrf | Obter token CSRF |
| POST | /auth/cadastro | Criar conta; agente exige `codigoAgente` |
| POST | /auth/login | Autenticar com `usuario` e `senha` |
| GET | /auth/me | Conta autenticada, sem hash de senha |
| POST | /auth/logout | Invalidar sessão |
| GET | /agentes | Listar nomes e identificadores de empresas/bancos |
| GET, POST | /clientes | Listar cadastros acessíveis / criar o próprio cadastro |
| GET, PUT, DELETE | /clientes/{id} | Consultar / atualizar / excluir cadastro |
| GET, POST | /automoveis | Listar veículos acessíveis / cadastrar veículo próprio |
| GET, POST | /pedidos | Listar pedidos acessíveis / cliente cria pedido |
| GET, PUT | /pedidos/{id} | Detalhe com histórico e contrato / editar pedido aberto |
| POST | /pedidos/{id}/cancelar | Cliente cancela pedido aberto |
| POST | /pedidos/{id}/avaliacoes | Agente responsável registra parecer |
| POST | /pedidos/{id}/contrato | Agente responsável executa pedido aprovado |

Cadastro de conta:

```json
{"usuario":"ana.silva","senha":"uma-senha-forte","nome":"Ana Silva","perfil":"CLIENTE"}
```

Cadastro do cliente (CPF abaixo é apenas dado de teste):

```json
{"rg":"MG123456","cpf":"52998224725","nome":"Cliente Teste","endereco":"Rua de Teste, 1","profissao":"Engenheiro","empregos":[{"entidade":"Empresa de Teste","rendimento":3500.00}]}
```

Pedido:

```json
{"automovelId":"UUID","agenteId":"UUID","inicio":"2027-01-10","fim":"2027-01-15","tipoContrato":"EMPRESA","bancoId":null}
```

Atualização de pedido: mesmo corpo mais `revisao` retornada pela última consulta. Avaliação: `{"aprovado":true,"parecer":"Renda compatível","revisao":1}`. Execução: `{"revisao":2,"creditoReferencia":null}`; com banco, informe uma referência não vazia. A revisão cresce em cada alteração/decisão para rejeitar ações baseadas em dados antigos.

## Respostas e autorização

- `201`: criação; `204`: exclusão/logout; `200`: consulta/atualização.
- `400`: validação; `401`: não autenticado; `403`: operação proibida ou CSRF inválido; `404`: registro inexistente/inacessível; `409`: duplicidade, vínculo, revisão desatualizada ou transição inválida.
- Erros de negócio retornam `{"message":"Explicação em português"}`.
- Clientes consultam/alteram somente seu cadastro e pedidos. A listagem “Meu cadastro” contém no máximo um cliente.
- Agentes consultam somente pedidos direcionados a eles e os dados dos clientes desses pedidos. Não podem editar o cadastro pessoal desses clientes.
- Automóveis de agentes são visíveis para seleção. Veículos particulares só são visíveis ao proprietário e ao agente de um pedido vinculado. O proprietário é derivado da conta, não aceito como campo livre.
- Exclusão de cadastro é física apenas quando não existem pedidos vinculados; não exclui a conta de acesso. A FK preserva o histórico.
- Não há exclusão física de pedidos, avaliações ou contratos.

## Concorrência e consistência

O serviço usa transações, bloqueio `FOR UPDATE` ao decidir/editar pedido e uma revisão otimista enviada pelo cliente. A execução também bloqueia o automóvel para impedir dois contratos em períodos sobrepostos. Pedidos podem disputar o mesmo carro durante análise; a reserva definitiva ocorre na execução do contrato. As datas inicial e final são inclusivas.

Constraints garantem unicidade de usuário, RG, CPF, matrícula, placa, contrato por pedido e referência de crédito por banco; posições de emprego só permitem valores de 1 a 3. Todas as consultas com parâmetros usam binding JDBC.
