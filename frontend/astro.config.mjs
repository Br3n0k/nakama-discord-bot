import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";

// Importe o adapter se for fazer deploy SSR em um ambiente Node.js específico
// import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind({
      // Configurações do Tailwind para Astro:
      // applyBaseStyles: true, // true por padrão, aplica os preflight styles do Tailwind.
                              // Defina como false se quiser gerenciar todos os estilos base manualmente.
    }), 
    react() // Integração com React para componentes .tsx/.jsx
  ],
  // URL base do seu site. Usado para gerar sitemaps, links canônicos, etc.
  // Substitua pelo seu domínio de produção.
  site: 'https://nakama.app', 

  // Define o modo de output.
  // 'static': (Padrão) Gera um site estático. Ótimo para performance e CDNs.
  // 'server': Gera um aplicativo que roda em um servidor Node.js, permitindo SSR por demanda.
  // 'hybrid': Permite que algumas rotas sejam pré-renderizadas (estáticas) e outras sejam SSR.
  output: 'hybrid', // 'hybrid' é uma boa escolha para ter landing pages estáticas e dashboard dinâmico.

  // Adapter: Necessário se 'output' for 'server' ou 'hybrid' e você for fazer deploy
  // em uma plataforma específica (Vercel, Netlify, Node.js, etc.).
  // Exemplo para um servidor Node.js genérico:
  // adapter: node({
  //   mode: "standalone" // ou "middleware"
  // }),

  // Configurações de desenvolvimento
  vite: {
    // Configurações do Vite, se necessário
  }
});
