# 🧠 Diretrizes para Agentes de IA no Projeto Nakama

Este documento fornece instruções e contexto para agentes de IA que trabalham no desenvolvimento do projeto **Nakama**.

## 🎯 Objetivo do Projeto Nakama

Criar a infraestrutura completa de um sistema chamado **Nakama**, uma aplicação integrada com Discord, que permite a captura e envio de áudio local do usuário para bots do Discord, com uso de uma interface web rica, login via Discord, dashboard pessoal e transmissão de áudio em tempo real.

---

## 🧱 Stack Tecnológica Principal

*   **Frontend (SPA SSR):** Astro + TailwindCSS + React
*   **Autenticação:** Discord OAuth2 + JWT
*   **Backend API:** Node.js (Fastify preferencialmente) com suporte a REST + WebSocket
*   **Bot Discord:** discord.js v14 + @discordjs/voice
*   **Captura de áudio:** Electron App auxiliar ou Native App com Node.js (usando `node-portaudio` ou `ffmpeg`)
*   **Streaming:** WebSocket (com buffers e compressão Opus/PCM)
*   **Banco de Dados:** PostgreSQL ou SQLite (desenvolvimento)
*   **Persistência de sessão:** Redis (opcional)
*   **Hospedagem:** Linux Server (preferência: Debian)

---

## 🖥️ Módulos da Aplicação e Responsabilidades

O projeto é dividido nos seguintes módulos principais. Ao trabalhar em um arquivo, identifique a qual módulo ele pertence e siga as especificações correspondentes.

### 1. **Frontend (Astro + React + Tailwind)** - `frontend/`

*   **Responsável:** Agente Frontend Astro
*   **Objetivo:** Criar layout da landing page, sistema de login, dashboard e integração com backend.
*   **Páginas Chave:**
    *   `/` → Landing page com apresentação do projeto Nakama e link de login.
    *   `/login` → Redirecionamento automático para OAuth2 Discord (ou página intermediária).
    *   `/dashboard` → Painel do usuário autenticado.
    *   `/auth/callback` → Rota de callback do Discord (manipulada pelo frontend após redirect do backend).
    *   `/docs` (opcional) → Página explicativa para guild owners/admins.
*   **Componentes React Chave (`.tsx`):**
    *   `LoginButton.tsx`: botão de login com Discord.
    *   `SessionDisplay.tsx`: mostra ID da sessão e opções de cópia.
    *   `AudioDeviceSelector.tsx`: componente React para listar dispositivos de áudio (interage com API do browser ou App de Captura via IPC se o frontend estiver no Electron).
    *   `StreamingStatus.tsx`: status da transmissão (pode usar WebSocket para tempo real).
    *   `Navbar.tsx`, `Sidebar.tsx`: para navegação no dashboard.
*   **Design:**
    *   Responsivo, dark mode de base.
    *   Cores inspiradas em neon/pixel art (tema retro-tech).
    *   Ícones de som, bot e Discord.
    *   Animações com Framer Motion (se aplicável).
*   **Observações:**
    *   Utilizar Astro para estrutura de páginas e SSR/SSG.
    *   Componentes interativos podem ser ilhas React (`client:load`, `client:visible`, etc.).
    *   TailwindCSS para estilização.

### 2. **Backend API (Node.js + Fastify)** - `backend/`

*   **Responsável:** Agente Backend API
*   **Objetivo:** Criar API REST, WebSocket e controle de sessões.
*   **Rotas REST Chave:**
    *   `POST /auth/discord` → Inicia login com Discord (redireciona para URL de autorização do Discord).
    *   `GET /auth/callback` → Recebe código de autorização do Discord, troca por token, cria sessão JWT, e define cookie HttpOnly. Redireciona para o callback do frontend.
    *   `GET /user/session` → Retorna dados da sessão ativa do usuário (protegida por JWT).
    *   `POST /bot/connect` → Chamada pelo Bot Discord para validar `id_sessao` e sinalizar prontidão para receber áudio. (Protegida por API Key do Bot).
*   **Rotas WebSocket Chave:**
    *   `GET /audio/stream` (upgrade para WebSocket) → Recebe chunks de áudio do App de Captura. Autenticada via token JWT (passado na query ou subprotocolo). Associa o WebSocket com o `id_sessao`.
*   **Middlewares/Hooks Fastify:**
    *   Autenticação JWT para rotas protegidas.
    *   Autenticação por API Key para rotas do bot.
    *   Rate limiting.
    *   Logging detalhado.
*   **Lógica de Sessão:**
    *   Geração de `id_sessao` (UUID) ao logar.
    *   Armazenar em banco de dados (PostgreSQL/SQLite) com TTL.
    *   Verificação de validade e propriedade da sessão.
*   **Observações:**
    *   Preferência por Fastify devido à performance e baixo overhead.
    *   Usar `async/await` e boas práticas de Node.js.
    *   Validar todos os inputs.

### 3. **Bot Discord (discord.js + voice)** - `discord-bot/`

*   **Responsável:** Agente Bot Discord
*   **Objetivo:** Desenvolver bot com comando `/music`, conexão ao canal e recebimento de áudio.
*   **Comando Slash Principal:**
    *   `/music <id_sessao>`:
        *   Usuário executa no Discord.
        *   Bot verifica se o usuário está em um canal de voz.
        *   Bot chama a API do backend (`POST /api/bot/connect`) para validar a `id_sessao` e o usuário.
        *   Se válido, conecta ao canal de voz do usuário.
        *   Inicia o recebimento do stream de áudio (lógica complexa aqui: o backend precisa "empurrar" ou o bot "puxar" o áudio da sessão correta).
*   **Reprodução de Áudio:**
    *   Usar `@discordjs/voice` (`AudioPlayer`, `createAudioResource`, `joinVoiceChannel`).
    *   Receber chunks de áudio do backend (provavelmente o bot se conectará a um WebSocket no backend ou o backend enviará dados para o bot via um canal estabelecido).
    *   Formato do áudio (PCM, Opus) deve ser consistente entre App de Captura, Backend e Bot. Opus é preferível para eficiência.
*   **Segurança e Validações:**
    *   Verificar se o `id_sessao` está ativo e pertence ao autor do comando (via backend).
    *   Timeout automático após inatividade ou se o stream de origem parar.
    *   Permissões adequadas no canal de voz (conectar, falar).
*   **Observações:**
    *   Usar discord.js v14 ou superior.
    *   Estruturar comandos e eventos de forma modular.

### 4. **App de Captura (Electron ou Node Standalone)** - `capture-app/`

*   **Responsável:** Agente Electron App (ou App Nativo)
*   **Objetivo:** Implementar app de captura de áudio com seleção de dispositivo e envio contínuo.
*   **Funcionalidades:**
    *   Interface gráfica (se Electron) para:
        *   Inserir `id_sessao` e `token JWT` (obtidos do dashboard web Nakama).
        *   Listar dispositivos de entrada de áudio disponíveis no sistema.
        *   Permitir ao usuário selecionar o dispositivo ativo para captura.
        *   Mostrar status da conexão e transmissão.
        *   Botões de Iniciar/Parar transmissão.
    *   Capturar áudio em tempo real do dispositivo selecionado.
        *   Tecnologias: `node-portaudio` (via `naudiodon` se Electron/Node) ou `ffmpeg` (pode ser invocado como processo filho).
        *   Considerar a necessidade de reamostragem ou conversão de formato (ex: para Opus).
    *   Enviar o áudio capturado via WebSocket para o endpoint `/api/audio/stream` do backend.
        *   Incluir `id_sessao` e `token JWT` na conexão WebSocket para autenticação.
        *   Enviar áudio em chunks (buffers).
*   **Tecnologias (se Electron):**
    *   Electron para o wrapper da aplicação desktop.
    *   Frontend simples dentro do Electron (HTML, CSS, JS ou um framework leve como React/Vue se necessário para a UI).
    *   IPC para comunicação entre processo principal e renderer do Electron.
    *   `electron-store` para persistir configurações (ex: `id_sessao` ou dispositivo preferido).
*   **Autenticação do App:**
    *   O app precisa do `id_sessao` e `token JWT` do usuário. Idealmente, o usuário os copia do dashboard web.
    *   O token JWT é usado para autenticar a conexão WebSocket com o backend.
*   **Observações:**
    *   Foco na simplicidade e eficiência.
    *   Minimizar uso de recursos do sistema.
    *   Fornecer feedback claro ao usuário sobre o status.

### 5. **DevOps e Infraestrutura**

*   **Responsável:** Agente DevOps (tarefa futura, após módulos principais)
*   **Objetivo:** Script de deploy, setup Docker, banco de dados, SSL.
*   **Tarefas:**
    *   Dockerfile para cada serviço (Backend, Bot, Frontend-SSR).
    *   `docker-compose.yml` para ambiente de desenvolvimento local.
    *   Scripts de deploy para servidor Linux (Debian preferencialmente).
    *   Setup e migração do banco de dados PostgreSQL.
    *   Configuração de proxy reverso (Nginx/Caddy) e SSL.

---

## 🧩 Banco de Dados (SQL) - `database/schema.sql`

Estrutura principal já definida em `database/schema.sql`.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY, -- Ou TEXT para SQLite
    discord_id VARCHAR NOT NULL UNIQUE,
    username TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW() -- Ajustar para SQLite (TEXT)
);

CREATE TABLE sessions (
    session_id UUID PRIMARY KEY, -- Ou TEXT para SQLite
    user_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(), -- Ajustar para SQLite (TEXT)
    expires_at TIMESTAMP -- Ajustar para SQLite (TEXT)
);
```
*   Usar UUIDs para IDs primários.
*   Garantir consistência entre PostgreSQL e SQLite para desenvolvimento.

---

## 🔄 Fluxo Completo (Resumo de Interação)

1.  **Usuário (Frontend):** Acessa `https://nakama.app` (ou localhost), clica em "Entrar com Discord".
2.  **Frontend -> Backend:** `POST /api/auth/discord`.
3.  **Backend -> Discord:** Redireciona usuário para URL de autorização OAuth2 do Discord.
4.  **Discord -> Backend:** Discord redireciona para `GET /api/auth/callback` com código de autorização.
5.  **Backend:** Troca código por token de acesso, obtém dados do usuário, cria/atualiza usuário no DB, cria `sessao` no DB, gera JWT.
6.  **Backend -> Frontend:** Define cookie HttpOnly com JWT e redireciona para `FRONTEND_CALLBACK_URL` (ex: `/auth/callback?success=true`).
7.  **Frontend:** Página de callback lida com o resultado. Se sucesso, redireciona para `/dashboard`.
8.  **Frontend (Dashboard):** Busca dados da sessão (`GET /api/user/session` com cookie JWT). Exibe `id_sessao` para o usuário.
9.  **Usuário (App de Captura):** Abre o App de Captura, insere `id_sessao` e `token JWT` (copiados do dashboard). Seleciona dispositivo de áudio. Clica "Iniciar Transmissão".
10. **App de Captura -> Backend:** Conecta-se ao WebSocket (`GET /api/audio/stream?sessionId=...&token=...`). Começa a enviar chunks de áudio.
11. **Usuário (Discord):** Entra em um canal de voz. Digita comando `/music <id_sessao>`.
12. **Bot Discord -> Backend:** `POST /api/bot/connect` (com `id_sessao`, `discord_user_id`, `voice_channel_id`; autenticado com API Key do Bot).
13. **Backend:** Valida a sessão e o usuário. Confirma que há um stream de áudio ativo do App de Captura para essa sessão.
14. **Backend <-> Bot Discord:** Backend começa a encaminhar os chunks de áudio da sessão para o Bot Discord (mecanismo a ser definido: bot se inscreve em stream, backend envia para endpoint do bot, etc.).
15. **Bot Discord:** Conecta-se ao canal de voz do usuário. Recebe os chunks de áudio e os reproduz usando `@discordjs/voice`.

---

## ✅ Princípios Gerais para Agentes

*   **Modularidade:** Mantenha o código de cada módulo o mais independente possível.
*   **Segurança:** Pense em segurança em todas as etapas (validação de entrada, autenticação, autorização, XSS, CSRF, etc.). Use HTTPS em produção.
*   **Eficiência:** O streaming de áudio deve ser o mais eficiente possível para minimizar latência e uso de recursos.
*   **Experiência do Usuário (UX):** Interfaces devem ser claras e intuitivas. Feedback ao usuário é crucial.
*   **Logs:** Implemente logging detalhado em todos os serviços, especialmente no backend e no bot, para facilitar o debug.
*   **Variáveis de Ambiente:** NÃO codifique segredos (tokens, API keys, senhas de DB) diretamente no código. Use variáveis de ambiente (e.g., via arquivos `.env` para desenvolvimento, e secrets management em produção). Crie arquivos `.env.example` para cada módulo.
*   **Comentários e Documentação:** Comente partes complexas do código. Adicione READMEs específicos para cada submódulo (`frontend/README.md`, `backend/README.md`, etc.) explicando como rodar e testar aquele módulo.
*   **Consistência de Código:** Siga as convenções de linting e formatação (ESLint, Prettier) se configuradas.
*   **Tratamento de Erros:** Implemente tratamento de erros robusto e forneça mensagens úteis.
*   **Placeholders:** Ao criar arquivos iniciais, use comentários como `// TODO: Implementar ...` ou `// Placeholder para ...` para indicar trabalho pendente.

---

Lembre-se de que este é um projeto complexo. Divida as tarefas em passos menores e teste frequentemente. Boa codificação!
