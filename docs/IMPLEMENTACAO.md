# Decisões da implementação e revisão dos modelos

## Base utilizada

Foram mantidos os projetos Spring Initializr (`backend`, pacote `com.example.backend`, classe `BackendApplication`, Maven Wrapper) e React + TypeScript/Vite (`frontend`). A versão do Spring Boot foi ajustada de 4.1.2 para **4.0.9**, atendendo à exigência 4.0.x do enunciado. Java permanece em 25. As versões de React, Vite e TypeScript da base foram preservadas.

## Arquitetura MVC e subsistemas

O React é a View e monta as páginas dinamicamente. Controllers REST recebem e validam DTOs, serviços executam regras/transações, modelos representam o domínio e o repository persiste no PostgreSQL via Spring JDBC. MVC não exige Thymeleaf nem JPA; a separação permanece explícita mesmo com View em um projeto separado.

| Pacote/arquivo | Responsabilidade |
|---|---|
| `controller/AuthController` | Cadastro, login, sessão atual, token CSRF |
| `controller/LocadoraController` | Endpoints de clientes, veículos, pedidos, pareceres e contratos |
| `controller/Requests` | DTOs com Bean Validation |
| `controller/ApiErrors` | Respostas de erro sem expor SQL ou credenciais |
| `service/ContaService` | BCrypt e convite de agentes |
| `service/LocadoraService` | Autorização por proprietário/agente, transações e regras do domínio |
| `model/Models` | Records de Usuario, Conta, Cliente, Emprego, Automovel, Pedido, Avaliacao e Contrato |
| `repository/LocadoraRepository` | Consultas parametrizadas, mapeamento e bloqueios JDBC |
| `config/SecurityConfig` | Sessão, CSRF, autenticação obrigatória e logout |
| `frontend/src/App.tsx` | Sessão, navegação e dashboard |
| `frontend/src/pages.tsx` | Formulários e detalhes |
| `frontend/src/lists.tsx` | Listas, filtros e ações |

O subsistema de gestão está no Spring; a construção dinâmica das páginas está no React. O banco não é acessível pelo browser. Veja [API](API.md) e [Supabase](SUPABASE.md).

## Refinamentos adotados

1. **Perfis:** cliente, empresa e banco são perfis de Usuario, em vez de uma hierarquia de entidades persistidas. Cliente possui extensão cadastral em relação 1:0..1; conta pode existir antes de completar os dados pessoais.
2. **CRUD do cliente:** cada pessoa administra somente seu próprio cadastro. Agentes leem dados/rendimentos apenas de clientes com pedidos direcionados a eles. A tela do protótipo com vários clientes torna-se a lista do agente; não permite a um cliente acessar outros clientes.
3. **Propriedade:** cada automóvel pertence a uma conta cadastrada. O tipo é obtido do perfil do proprietário e não é um texto livre. Cliente/empresa/banco cadastram seus próprios automóveis. Não foi implementada transferência de propriedade.
4. **Tipos de contrato:** o PDF não define nomes comerciais nem regras de correspondência. Para o protótipo, adotam-se os tipos `CLIENTE`, `EMPRESA`, `BANCO`, com correspondência direta ao perfil do proprietário. Essa é uma decisão explícita de implementação para validar com o professor, não uma regra adicional extraída do enunciado.
5. **Escopo do agente:** o cliente escolhe um agente responsável ao introduzir o pedido. O agente não muda depois; para mudar, o cliente cancela e cria outro pedido. Evita expor pedidos e dados financeiros a todos os agentes.
6. **Período:** início e fim são obrigatórios, não retroativos na criação/edição/execução, e têm limites inclusivos. Contratos do mesmo veículo não podem se sobrepor. Ainda pode haver vários pedidos em análise para o mesmo carro.
7. **Parecer:** positivo aprova, negativo reprova. Editar o pedido invalida a aprovação e retorna a análise. Pareceres anteriores são preservados e identificados pela revisão avaliada. A própria decisão incrementa a revisão para invalidar formulários antigos.
8. **Contrato:** só o agente responsável executa o pedido aprovado. Aprovação não executa contrato automaticamente. Uma restrição única evita duplicidade. Pedido contratado/cancelado é terminal.
9. **Crédito:** o pedido pode indicar um banco agente. Na contratação, exige referência do crédito já concedido. O par banco/referência só pode aparecer em um contrato. Não há integração com sistemas bancários nem decisão automática de crédito. A associação é armazenada no Contrato, sem criar uma entidade com um processo bancário inexistente no escopo.
10. **Exclusão:** cliente com qualquer pedido vinculado não pode ser excluído. Excluir o cadastro não exclui a conta de acesso; é possível completar o cadastro novamente. Pedidos cancelados são preservados.
11. **Cadastro dos agentes:** exige convite configurado pelo operador. O cadastro público de cliente não pode escolher livremente privilégios de agente.
12. **Persistência:** Flyway versiona o schema `momentcar`; o perfil padrão usa PostgreSQL/Supabase. H2 existe apenas para testes e experimentação local.

## Rastreabilidade

| Requisito | Entrega |
|---|---|
| R1 / HU01 | Cadastro/login obrigatório, hash BCrypt, sessão, logout e CSRF |
| R2 / HU04–HU07 | Criar, consultar, editar e cancelar; dashboard e filtros |
| R3 / HU08–HU09 | Parecer de agente, histórico e execução de contrato aprovado |
| R4 / HU02–HU03 | CRUD de cliente, CPF validado e no máximo 3 rendimentos |
| R5 / HU10 | Matrícula, ano, marca, modelo, placa e proprietário autenticado |
| R6 / HU11 | Banco e referência de contrato de crédito opcional |
| R7–R8 | MVC, Java 25, Spring Boot 4.0.9, Maven, React/Vite e Supabase |
| R9 | Testes, documentação e modelos versionados revisados em PlantUML |

## Modelos

As imagens originais em `docs/` foram preservadas como versão inicial. Os arquivos `docs/uml/*-v2.puml` descrevem a implementação atual e podem ser abertos no PlantUML ou em uma extensão compatível. Não substituem silenciosamente as imagens antigas; consulte [diagramas](diagramas.md) para comparar as versões.

## Limites do protótipo

Não há cálculo de diárias, cobrança, assinatura eletrônica, rescisão, transferência de propriedade, recuperação de senha ou concessão bancária. Esses processos não foram especificados no laboratório. O comprovante é uma visualização imprimível do registro de contrato. O sistema usa uma instância de servidor com sessão em memória; não houve implantação pública nem configuração de um projeto Supabase do usuário.
