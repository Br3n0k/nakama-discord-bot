// backend/server.js
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyWebsocket from '@fastify/websocket';

// Importar rotas
import authRoutes from './src/routes/auth.js';
import userRoutes, { mockUsers, mockSessions } from './src/routes/user.js'; // Importando mocks temporariamente
import audioRoutes, { activeAudioStreams } from './src/routes/audio.js'; // Importando mocks temporariamente
import botRoutes from './src/routes/bot.js';

// Variáveis de ambiente (carregar de .env em um projeto real com algo como dotenv)
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeydontusethisinproduction!';
const BOT_API_KEY = process.env.BOT_API_KEY || 'supersecretbotapikey'; // Chave para o bot se autenticar

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Plugins Essenciais
fastify.register(fastifyCors, {
  origin: (origin, cb) => {
    // Permitir requisições do frontend Astro (ex: http://localhost:4321)
    // e potencialmente de outros domínios/apps (Electron app, bot)
    const allowedOrigins = [
        'http://localhost:4321', // Frontend Astro (dev)
        // Adicionar URL de produção do frontend aqui
    ];
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      cb(null, true);
      return;
    }
    cb(new Error('Not allowed by CORS'), false);
  },
  credentials: true, // Importante para cookies
});

fastify.register(fastifyCookie);

fastify.register(fastifyJwt, {
  secret: JWT_SECRET,
  cookie: {
    cookieName: 'nakama_token', // Nome do cookie que o @fastify/jwt procurará
    signed: false, // Se o cookie em si é assinado (não o payload JWT)
  }
});

fastify.register(fastifyWebsocket);

// Decorator para autenticação de rotas HTTP (JWT)
fastify.decorate('authenticate', async function (request, reply) {
  try {
    await request.jwtVerify(); // Verifica JWT do header ou do cookie 'nakama_token'
    // request.user conterá o payload decodificado do JWT
  } catch (err) {
    fastify.log.warn(`Falha na autenticação JWT: ${err.message}`);
    reply.code(401).send({ error: 'Não autorizado', message: 'Token inválido ou expirado.' });
  }
});

// Decorator para autenticação de conexões WebSocket (ex: via query param ou subprotocol)
// Este é um exemplo, pode precisar de ajuste fino.
fastify.decorate('authenticateWs', async function (request, reply) {
    // Para WebSockets, o token pode vir de várias formas:
    // 1. Query parameter: ?token=xxx
    // 2. Sec-WebSocket-Protocol header: (mais complexo de configurar no cliente)
    // 3. O cliente envia uma mensagem de 'auth' após conectar.
    
    // Exemplo com query parameter:
    const token = request.query.token;
    if (!token) {
        // Se não houver token na query, tentar verificar se há um cookie JWT válido
        // Isso pode não funcionar diretamente com todos os clientes WebSocket,
        // pois eles podem não enviar cookies por padrão.
        try {
            await request.jwtVerify({ onlyCookie: true }); // Tenta verificar apenas o cookie
            fastify.log.info(`WS autenticado via cookie para sessão: ${request.user?.sessionId}`);
            return; // Autenticado via cookie
        } catch (cookieErr) {
            // Não conseguiu autenticar via cookie, prossegue para verificar token de query.
        }
        
        fastify.log.warn('WS Auth: Nenhum token fornecido na query string.');
        // Não use reply.send() aqui, pois a conexão já está estabelecida.
        // A lógica no handler do WebSocket deve fechar a conexão se não autenticado.
        // Ou, se o fastify-websocket permitir, lançar um erro aqui pode fechar a conexão.
        // Por agora, vamos permitir a conexão e o handler da rota /audio/stream verificará req.user
        // e fechará se não estiver autenticado.
        // Melhor seria fechar aqui, mas o `reply` não é para fechar WS.
        // A documentação do fastify-websocket sugere tratar isso no handler da rota.
        // Ou usar o hook 'onAuthorize' do uWebSockets.js se estiver usando-o diretamente.
        return; // Permite continuar, mas request.user não será definido se o token query falhar
    }

    try {
        const decoded = fastify.jwt.verify(token);
        request.user = decoded; // Adiciona o usuário decodificado ao request
        fastify.log.info(`WS autenticado via token query para sessão: ${request.user?.sessionId}`);
    } catch (err) {
        fastify.log.warn(`WS Auth: Token da query inválido: ${err.message}`);
        // request.user não será definido. O handler da rota deve verificar isso.
    }
});


// Decorator para autenticar o bot (ex: via API Key em um header)
fastify.decorate('authenticateBot', async function (request, reply) {
  const apiKey = request.headers['x-bot-api-key'];
  if (!apiKey || apiKey !== BOT_API_KEY) {
    fastify.log.warn('Tentativa de acesso não autorizada à API do bot.');
    reply.code(401).send({ error: 'Não autorizado', message: 'API Key inválida ou ausente.' });
  }
  // Se a chave for válida, a requisição prossegue.
});


// Disponibilizar mocks globalmente na instância do Fastify (SOMENTE PARA PLACEHOLDER)
// Em uma aplicação real, use injeção de dependência ou serviços.
fastify.decorate('mockUsers', mockUsers);
fastify.decorate('mockSessions', mockSessions);
fastify.decorate('activeAudioStreams', activeAudioStreams);


// Registrar rotas
fastify.register(authRoutes, { prefix: '/api' });
fastify.register(userRoutes, { prefix: '/api' }); // userRoutes agora pode acessar fastify.mockUsers, etc.
fastify.register(audioRoutes, { prefix: '/api' }); // audioRoutes também
fastify.register(botRoutes, { prefix: '/api' });


// Rota de health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Iniciar o servidor
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Servidor Nakama Backend rodando em http://${HOST}:${PORT}`);
    fastify.log.info(`JWT Secret (dev): ${JWT_SECRET.substring(0,10)}...`);
    fastify.log.info(`Bot API Key (dev): ${BOT_API_KEY.substring(0,10)}...`);
    fastify.log.info(`Frontend callback (dev): ${process.env.FRONTEND_CALLBACK_URL}`);
    fastify.log.info(`Discord Redirect URI (dev): ${process.env.DISCORD_REDIRECT_URI}`);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

// Exportar o app para testes ou outros usos (opcional)
export default fastify;
