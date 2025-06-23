import React, { useState, useEffect } from 'react';

// Este componente pode se conectar a um WebSocket para atualizações em tempo real
// ou buscar status periodicamente de um endpoint da API.
// Para o placeholder, vamos simular alguns estados.

type Status = 'disconnected' | 'capture_ready' | 'bot_ready' | 'streaming' | 'error';

interface StreamingStatusProps {
  sessionId: string;
}

interface StreamingData {
  status: Status;
  captureAppConnected: boolean;
  botConnected: boolean;
  lastActivity: string | null;
  bitrate: number;
  latency: number;
  errorMessage?: string;
}

const StreamingStatus: React.FC<StreamingStatusProps> = ({ sessionId }) => {
  const [streamingData, setStreamingData] = useState<StreamingData>({
    status: 'disconnected',
    captureAppConnected: false,
    botConnected: false,
    lastActivity: null,
    bitrate: 0,
    latency: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  // Buscar status da transmissão
  const fetchStreamingStatus = async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch('/api/audio/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setStreamingData(prev => ({
          ...prev,
          status: data.status,
          captureAppConnected: data.captureAppConnected,
          botConnected: data.botConnected,
          lastActivity: data.lastActivity,
          // Simular métricas (em produção viria do backend)
          bitrate: data.status === 'streaming' ? Math.floor(Math.random() * 64) + 64 : 0,
          latency: data.status === 'streaming' ? Math.floor(Math.random() * 100) + 50 : 0
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar status:', error);
      setStreamingData(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Erro ao conectar com servidor'
      }));
    }
  };

  // Polling para atualizar status
  useEffect(() => {
    fetchStreamingStatus();
    
    const interval = setInterval(fetchStreamingStatus, 3000); // A cada 3 segundos
    return () => clearInterval(interval);
  }, [sessionId]);

  const getStatusInfo = () => {
    switch (streamingData.status) {
      case 'streaming':
        return {
          text: '🔴 Transmitindo ao Vivo',
          color: 'text-green-400',
          bgColor: 'bg-green-900/20',
          borderColor: 'border-green-600'
        };
      case 'capture_ready':
        return {
          text: '🟡 Capture App Conectado',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-900/20',
          borderColor: 'border-yellow-600'
        };
      case 'bot_ready':
        return {
          text: '🔵 Bot Discord Conectado',
          color: 'text-blue-400',
          bgColor: 'bg-blue-900/20',
          borderColor: 'border-blue-600'
        };
      case 'error':
        return {
          text: '❌ Erro de Conexão',
          color: 'text-red-400',
          bgColor: 'bg-red-900/20',
          borderColor: 'border-red-600'
        };
      default:
        return {
          text: '⚪ Desconectado',
          color: 'text-gray-400',
          bgColor: 'bg-gray-800/50',
          borderColor: 'border-gray-600'
        };
    }
  };

  const statusInfo = getStatusInfo();

  const formatLastActivity = (lastActivity: string | null) => {
    if (!lastActivity) return 'Nunca';
    
    const date = new Date(lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `${diffSec}s atrás`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}min atrás`;
    return date.toLocaleTimeString('pt-BR');
  };

  const openCaptureApp = () => {
    // Instruções para abrir o Capture App
    const instructions = `
Para conectar o Capture App:

1. Abra o Nakama Capture App no seu PC
2. Cole sua Session ID: ${sessionId}
3. Configure seu token JWT (copie do seu navegador se necessário)
4. Clique em "Iniciar Transmissão"

O app deve aparecer como "Conectado" em alguns segundos.
    `;
    alert(instructions);
  };

  return (
    <div className="space-y-4">
      {/* Status Principal */}
      <div className={`p-4 rounded-lg border ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-lg font-semibold ${statusInfo.color}`}>
            {statusInfo.text}
          </h3>
          {streamingData.status === 'streaming' && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 text-sm font-medium">AO VIVO</span>
            </div>
          )}
        </div>

        {streamingData.errorMessage && (
          <p className="text-red-300 text-sm mb-3">{streamingData.errorMessage}</p>
        )}

        {/* Grid de Status */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              streamingData.captureAppConnected ? 'bg-green-400' : 'bg-gray-400'
            }`}></div>
            <span className="text-gray-300">
              Capture App: {streamingData.captureAppConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              streamingData.botConnected ? 'bg-green-400' : 'bg-gray-400'
            }`}></div>
            <span className="text-gray-300">
              Discord Bot: {streamingData.botConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
        </div>
      </div>

      {/* Métricas de Transmissão */}
      {streamingData.status === 'streaming' && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <h4 className="text-purple-400 font-semibold mb-3">📊 Métricas da Transmissão</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{streamingData.bitrate}</div>
              <div className="text-gray-400">kbps</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{streamingData.latency}</div>
              <div className="text-gray-400">ms latência</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">PCM</div>
              <div className="text-gray-400">formato</div>
            </div>
          </div>
        </div>
      )}

      {/* Informações Detalhadas */}
      <div className="bg-gray-800/50 p-3 rounded-lg text-xs text-gray-400">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <strong>Session ID:</strong> {sessionId.substring(0, 8)}...
          </div>
          <div>
            <strong>Última Atividade:</strong> {formatLastActivity(streamingData.lastActivity)}
          </div>
          <div>
            <strong>Qualidade:</strong> 48kHz, 16-bit, Mono
          </div>
          <div>
            <strong>Protocolo:</strong> WebSocket + PCM
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-2">
        {!streamingData.captureAppConnected && (
          <button
            onClick={openCaptureApp}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm flex-1"
          >
            📱 Conectar Capture App
          </button>
        )}
        
        {!streamingData.botConnected && streamingData.captureAppConnected && (
          <div className="bg-yellow-900/20 border border-yellow-600 p-3 rounded text-sm text-yellow-300 flex-1">
            <strong>Próximo passo:</strong> Use o comando <code className="bg-gray-700 px-1 rounded">/music {sessionId}</code> no Discord
          </div>
        )}

        {streamingData.status === 'streaming' && (
          <button
            onClick={() => window.location.reload()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
          >
            🔄 Atualizar
          </button>
        )}
      </div>

      {/* Guia Rápido */}
      {streamingData.status === 'disconnected' && (
        <div className="bg-gray-700 p-4 rounded-lg">
          <h4 className="text-gray-300 font-semibold mb-2">🚀 Para começar:</h4>
          <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
            <li>Abra o Nakama Capture App no seu PC</li>
            <li>Configure com sua Session ID: <code className="bg-gray-600 px-1 rounded text-xs">{sessionId}</code></li>
            <li>No Discord, entre em um canal de voz</li>
            <li>Digite: <code className="bg-gray-600 px-1 rounded text-xs">/music {sessionId}</code></li>
            <li>Selecione seu dispositivo de áudio e comece a transmitir!</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default StreamingStatus;
