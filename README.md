# Nakama 🎧 - Sua Voz no Discord, Simplificada

**Nakama** é um projeto que permite capturar o áudio local do seu computador e transmiti-lo diretamente para bots em seus canais de voz do Discord. Ele utiliza uma interface web para gerenciamento de sessões e um aplicativo auxiliar para a captura de áudio.

O objetivo é fornecer uma solução integrada e fácil de usar para compartilhar áudio do PC com amigos ou comunidades no Discord através de um bot dedicado.

## 🚀 Visão Geral do Projeto

O sistema Nakama é composto pelos seguintes módulos principais:

*   **[Frontend](./frontend/README.md)**: Uma Single Page Application (SPA) com Server-Side Rendering (SSR) construída com Astro, React e TailwindCSS. Serve como dashboard para o usuário gerenciar suas sessões de áudio e autenticar via Discord.
*   **[Backend API](./backend/README.md)**: Uma API robusta desenvolvida em Node.js (com Fastify) que lida com autenticação, gerenciamento de sessões, e o recebimento/encaminhamento de streams de áudio via WebSockets.
*   **[Bot Discord](./discord-bot/README.md)**: Um bot desenvolvido com discord.js v14 que se conecta aos canais de voz do Discord e reproduz o áudio recebido do backend.
*   **[App de Captura](./capture-app/README.md)**: Um aplicativo auxiliar (Electron) que roda localmente no computador do usuário para capturar o áudio do sistema ou de um dispositivo específico e enviá-lo para o Backend API.
*   **[Banco de Dados](./database/schema.sql)**: Esquema SQL para PostgreSQL (com notas para SQLite) para persistência de dados de usuários e sessões.

## ✨ Funcionalidades Principais (Planejadas)

*   **Login via Discord OAuth2**: Autenticação segura e integrada com o Discord.
*   **Dashboard Pessoal**: Interface web para visualizar e gerenciar o ID da sessão de áudio.
*   **Seleção de Dispositivo de Áudio**: O App de Captura permitirá selecionar qual fonte de áudio transmitir.
*   **Transmissão em Tempo Real**: Baixa latência na transmissão de áudio do PC para o Discord.
*   **Comando de Bot Simples**: Fácil ativação do bot no canal de voz usando um ID de sessão (`/music <id_sessao>`).
*   **Segurança de Sessão**: Sessões com tempo de vida limitado e validação.

## 🛠️ Stack Tecnológica Principal

*   **Frontend**: Astro, React, TailwindCSS
*   **Backend**: Node.js, Fastify, WebSocket
*   **Bot Discord**: discord.js, @discordjs/voice
*   **App de Captura**: Electron
*   **Banco de Dados**: PostgreSQL (preferencial) / SQLite (desenvolvimento)
*   **Autenticação**: Discord OAuth2, JWT

## 📖 Como Funciona (Fluxo Resumido)

1.  O usuário acessa o site do Nakama e faz login com sua conta do Discord.
2.  O backend autentica o usuário, gera um ID de sessão único e o exibe no dashboard.
3.  O usuário abre o App de Captura Nakama em seu PC, insere o ID da sessão (e token JWT, se necessário para autenticar o app) e seleciona o dispositivo de áudio.
4.  O App de Captura começa a enviar o áudio para o Backend API via WebSocket, associado ao ID da sessão.
5.  No Discord, o usuário entra em um canal de voz e usa o comando `/music <id_sessao>` do bot Nakama.
6.  O Bot Nakama verifica a validade da sessão com o Backend API.
7.  Se a sessão for válida e houver áudio sendo transmitido, o bot entra no canal de voz e começa a reproduzir o áudio recebido do backend.

## 🏁 Próximos Passos (Desenvolvimento)

Este repositório contém a estrutura inicial e os placeholders para cada módulo do projeto Nakama. Os próximos passos envolvem:

1.  Implementar a lógica detalhada em cada arquivo placeholder.
2.  Configurar os ambientes de desenvolvimento para cada módulo.
3.  Desenvolver e testar as integrações entre os módulos (Frontend <-> Backend, Backend <-> Bot, App de Captura <-> Backend).
4.  Refinar a UI/UX do frontend e do App de Captura.
5.  Implementar testes unitários e de integração.
6.  Preparar scripts de build e deploy.

---

*Este projeto foi iniciado como um exercício de geração de estrutura de código por uma IA.*
*Consulte o arquivo `AGENTS.md` para mais detalhes sobre as diretrizes de desenvolvimento.*
