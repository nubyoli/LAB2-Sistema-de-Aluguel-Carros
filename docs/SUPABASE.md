# Configurar o Supabase e executar o MomentCar

O Supabase fornece o **PostgreSQL**. O login da aplicação é implementado no Spring Security, com usuário/senha, BCrypt e sessão HTTP. Não é necessário ativar Supabase Auth, criar usuários no painel Authentication ou copiar chaves `anon`, `publishable` ou `service_role` para o React.

## 1. Criar o banco

1. Entre em [supabase.com/dashboard](https://supabase.com/dashboard) e crie um projeto.
2. Escolha uma região próxima e guarde a **senha do banco** definida na criação. Ela é diferente da senha da sua conta Supabase.
3. Aguarde o provisionamento. Abra **Connect** e selecione **Session pooler**. Copie host, porta, database e user exibidos no painel. O Session pooler permite conectar o servidor em redes IPv4. Não confunda com o Transaction pooler.
4. Normalmente a porta é `5432`, o database é `postgres` e o usuário é `postgres.<referência-do-projeto>`. Use os valores reais do seu painel; o host depende da região/projeto.

Referência: [conexão com PostgreSQL no Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

## 2. Configurar o back-end

Pré-requisito: **JDK 25**. O Maven Wrapper incluído baixa o Maven automaticamente; sua primeira execução precisa de internet. Abra um terminal na raiz do repositório:

```powershell
cd backend
Copy-Item .env.example .env
```

Edite `backend/.env`:

```properties
DB_URL=jdbc:postgresql://HOST_COPIADO_DO_SESSION_POOLER:5432/postgres?sslmode=require
DB_USERNAME=postgres.REFERENCIA_DO_PROJETO
DB_PASSWORD=SENHA_DO_BANCO
AGENT_REGISTRATION_CODE=UM_CODIGO_PRIVADO_LONGO_ESCOLHIDO_POR_VOCE
COOKIE_SECURE=false
```

- Não coloque aspas ao redor dos valores. Este arquivo é lido como Java `.properties`, não como script de shell. Se a senha contiver barra invertida, represente cada `\` por `\\`, ou use uma variável de ambiente do sistema para `DB_PASSWORD`.
- A senha fica em campo separado: não precisa de URL encoding e não deve ser incluída na URL JDBC.
- `sslmode=require` exige conexão criptografada. Para implantação com verificação da identidade do servidor, baixe o certificado raiz no painel do banco e use `sslmode=verify-full&sslrootcert=C:/caminho/certificado.crt`, seguindo a [documentação de SSL do Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).
- Nunca copie esse arquivo para `frontend`, nem use prefixo `VITE_` em credenciais do banco. O `.gitignore` já exclui `.env`.
- O código de agente é um convite privado para registrar empresas e bancos. Sem configurá-lo, apenas clientes podem criar contas. Não é senha de banco, chave do Supabase nem senha de login. Pode ser removido após cadastrar os agentes; contas existentes continuam funcionando.

Inicie **a partir da pasta backend**, pois o caminho do `.env` é relativo ao diretório de execução:

```powershell
# Se JAVA_HOME não estiver configurado, ajuste ao seu JDK instalado:
$env:JAVA_HOME='C:\Program Files\Java\jdk-25.0.4'
.\mvnw.cmd spring-boot:run
```

Linux/macOS: `./mvnw spring-boot:run` (se necessário, `chmod +x mvnw`).

O Flyway cria automaticamente o schema `momentcar` e as tabelas:

| Tabela | Conteúdo |
|---|---|
| usuarios | Contas, perfil e hash da senha |
| clientes | RG, CPF, nome, endereço e profissão |
| empregos | Até três empregadores/rendimentos por cliente |
| automoveis | Identificação e proprietário do veículo |
| pedidos | Período, cliente, agente, automóvel, crédito opcional e status |
| avaliacoes | Histórico de pareceres financeiros |
| contratos | Contrato executado e referência opcional do crédito |
| flyway_schema_history | Controle das migrações |

**Não execute `V1__estrutura_inicial.sql` manualmente** antes da aplicação: o Flyway controla sua execução. Também não edite uma migração já aplicada; crie uma `V2__...sql` para evoluir o banco.

## 3. Manter o banco privado

O navegador usa somente `/api`, passando pela autorização do Spring. O schema `momentcar` **não deve ser incluído nos schemas expostos da Data API do Supabase**. Ele não depende de acesso anônimo às tabelas.

Após a primeira inicialização, execute o conteúdo de [`backend/supabase/privacidade.sql`](../backend/supabase/privacidade.sql) no **SQL Editor** do Supabase. O script revoga acesso de `anon`, `authenticated` e `PUBLIC` ao schema e às tabelas do sistema; não remove o acesso do proprietário que executa a aplicação. Não habilite políticas públicas para fazer o front funcionar: o front não acessa o banco diretamente.

O uso de `postgres` simplifica a configuração acadêmica. Em uma implantação real, separe a conta que executa migrações de uma conta de aplicação com apenas os privilégios necessários. Mantenha o banco fora da Data API e use HTTPS.

## 4. Iniciar o front-end

Abra **outro terminal**, também na raiz do projeto:

```powershell
cd frontend
npm ci
npm run dev
```

Acesse [http://127.0.0.1:5173](http://127.0.0.1:5173). O Vite encaminha `/api` para `http://localhost:8080`. Não é necessário `.env` no front-end. Se mudar a porta do Spring, ajuste o proxy em `frontend/vite.config.ts`.

## 5. Demonstrar os perfis e o fluxo completo

1. Na tela de entrada, escolha **Cadastre-se** e crie uma conta **Agente — empresa**, usando seu código privado. Cadastre um automóvel. Ele ficará vinculado à empresa autenticada.
2. Para demonstrar crédito opcional, crie também uma conta **Agente — banco**, com o mesmo código de convite. O nome do banco aparecerá na seleção de crédito.
3. Saia e crie uma conta **Cliente — pessoa física**. Complete o cadastro com RG, CPF válido, nome, endereço e profissão. Informe zero a três fontes de renda.
4. Faça um **Novo pedido**, escolhendo automóvel, agente responsável e datas. O tipo de contrato acompanha a categoria do proprietário. Se quiser demonstrar crédito, selecione o banco.
5. O pedido aparece **Em análise**. O cliente pode consultar, editar e cancelar enquanto não estiver contratado ou cancelado.
6. Saia e entre com a **empresa escolhida como agente**. Abra o pedido, consulte o cadastro/rendimentos do cliente e registre um parecer. O status passa a **Aprovado** ou **Reprovado**.
7. Com parecer positivo, clique em **Executar contrato**. Se houver crédito, informe a referência de um contrato de crédito já concedido. O sistema registra essa referência; não realiza concessão bancária.
8. Entre novamente como cliente. Consulte o contrato e use **Imprimir comprovante** se desejar. Não há assinatura digital ou processamento de pagamentos.

Use perfis de navegador separados ou uma janela anônima para testar cliente e agente simultaneamente. Abas do mesmo perfil compartilham a sessão. O sistema inicia vazio, sem contas ou senhas de demonstração embutidas.

## Alternativa local, sem Supabase

Para experimentar a interface antes de criar o projeto Supabase:

```powershell
cd backend
$env:AGENT_REGISTRATION_CODE='escolha-um-codigo-local'
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local'
```

O perfil `local` usa H2, grava em `backend/data/` e não altera o Supabase. Execute o front normalmente. Para voltar ao Supabase, pare o back-end e inicie **sem** `-Dspring-boot.run.profiles=local`. Dados de H2 não são transferidos automaticamente. Para a apresentação que exige Supabase, use o perfil padrão.

## Testes e build

```powershell
# Dentro de backend
.\mvnw.cmd test
.\mvnw.cmd package

# Em outro terminal, dentro de frontend
npm run build
```

Os testes usam H2 isolado em memória e não leem o `.env` de desenvolvimento. Existe opção `TEST_DB_URL`, `TEST_DB_USERNAME` e `TEST_DB_PASSWORD` para testar com PostgreSQL, **somente em banco descartável exclusivo de testes**: a suíte limpa as tabelas `momentcar` antes de cada cenário. Nunca aponte essas variáveis para seu banco com dados reais.

## Teste HTTP opcional

O script `backend/scripts/smoke-http.mjs` verifica cadastro, login, cookies/CSRF e o fluxo até o contrato através da API real. Ele cria contas e registros sintéticos; use **apenas em uma instância descartável**. Com o front e o back locais em execução, dentro de `backend`:

```powershell
$env:SMOKE_API_URL='http://127.0.0.1:5173/api'
$env:SMOKE_AGENT_CODE='o-codigo-configurado-na-instancia-de-teste'
node scripts/smoke-http.mjs
```

Por padrão, a senha de teste é aleatória e não é exibida. Para completar o cenário manualmente no navegador, defina `SMOKE_PASSWORD` com uma senha **exclusiva de teste** e `SMOKE_STOP_AT_ORDER=true`: o script imprime os usuários e o pedido pendente. Remova essa última variável para executar novamente o cenário completo. O script não limpa registros existentes.

## Problemas frequentes

| Sintoma | O que verificar |
|---|---|
| `JAVA_HOME` incorreto / versão de classe incompatível | `java -version` e JDK 25 no terminal e na IDE |
| Maven Wrapper não baixa | Internet e acesso a `repo.maven.apache.org` |
| `DB_URL` não encontrado | `.env` dentro de `backend`; terminal executando nessa pasta |
| `password authentication failed` | Senha **do banco**; usuário completo do Session pooler |
| `UnknownHost`, `Network unreachable` | Host real do painel; use Session pooler em redes IPv4; projeto ativo |
| Conexão recusada / projeto pausado | Retome o projeto no painel e confira host/porta |
| Tabelas não aparecem no Table Editor | Selecione o schema `momentcar`; também é possível consultar pelo SQL Editor |
| Erro 401 | Faça login novamente; sessão expira após 30 minutos de inatividade ou reinício do servidor |
| Erro 403 ao cadastrar agente | Código de convite incorreto ou não configurado |
| Erro 403 de sessão ao salvar | Atualize a página; use sempre o mesmo host do front e permita cookies |
| Erro 409 ao salvar | Registro duplicado, revisão antiga ou regra de vínculo; veja a mensagem na tela |
| Lista de agentes vazia | Cadastre uma empresa/banco antes do primeiro pedido |
| CPF recusado | A validação verifica os dígitos do CPF; números repetidos não são aceitos |
| Porta 8080 ocupada | Defina `PORT` no `.env` e altere o proxy do Vite |

## Implantação posterior

O Supabase hospeda o banco, não este servidor Java. Publique o JAR em um serviço compatível com Java 25 e os arquivos de `frontend/dist` em hospedagem estática. Configure o proxy de produção para encaminhar `/api` ao Spring **na mesma origem do front**, pois o proxy do Vite é apenas de desenvolvimento/preview. Use HTTPS, `COOKIE_SECURE=true` e configure os segredos no provedor. A sessão é mantida em memória: reinícios exigem novo login; múltiplas instâncias exigiriam um armazenamento compartilhado de sessões. Publicação não foi realizada neste trabalho.
