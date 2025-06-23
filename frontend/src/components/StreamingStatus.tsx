import React, { useState, useEffect } from 'react';

// Este componente pode se conectar a um WebSocket para atualizações em tempo real
// ou buscar status periodicamente de um endpoint da API.
// Para o placeholder, vamos simular alguns estados.

type Status = 'disconnected' | 'connecting' | 'connected' | 'streaming' | 'error' | 'paused';

interface StreamingStatusProps {
  sessionId?: string; // Opcional, para buscar status específico da sessão
}

const StreamingStatus: React.FC<StreamingStatusProps> = ({ sessionId }) => {
  const [status, setStatus] = useState<Status>('disconnected');
  const [bitrate, setBitrate] = useState<number>(0); // kbps
  const [latency, setLatency] = useState<number>(0); // ms
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Simulação de mudança de status
  useEffect(() => {
    // Em uma aplicação real, aqui você iniciaria a conexão WebSocket com o backend
    // ou faria polling para obter o status.
    // Ex: const ws = new WebSocket(`wss://your-backend.com/api/audio/status?sessionId=${sessionId}`);
    // ws.onmessage = (event) => { /* parse event.data e atualize o estado */ };
    
    console.log(`StreamingStatus: Observando sessão ${sessionId || 'geral'}`);

    const mockStatusUpdates: Status[] = ['connecting', 'connected', 'streaming'];
    let currentMockIndex = 0;

    const intervalId = setInterval(() => {
      if (currentMockIndex < mockStatusUpdates.length) {
        setStatus(mockStatusUpdates[currentMockIndex]);
        if (mockStatusUpdates[currentMockIndex] === 'streaming') {
          setBitrate(Math.floor(Math.random() * (128 - 64 + 1)) + 64); // Random bitrate 64-128kbps
          setLatency(Math.floor(Math.random() * (150 - 50 + 1)) + 50); // Random latency 50-150ms
        }
        currentMockIndex++;
      } else {
        // Simula uma desconexão ou erro aleatório após um tempo
        // if (Math.random() > 0.8) {
        //   setStatus('error');
        //   setErrorMessage('Conexão perdida com o servidor de áudio.');
        //   clearInterval(intervalId);
        // } else if (Math.random() > 0.6) {
        //   setStatus('paused');
        // }
      }
    }, 2000); // Muda status a cada 2 segundos

    return () => clearInterval(intervalId); // Limpa o intervalo ao desmontar
  }, [sessionId]);

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
      case 'streaming':
        return 'text-green-400';
      case 'connecting':
        return 'text-yellow-400';
      case 'disconnected':
      case 'error':
        return 'text-red-400';
      case 'paused':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Conectado ao Servidor de Áudio';
      case 'streaming': return 'Transmitindo Áudio';
      case 'connecting': return 'Conectando...';
      case 'disconnected': return 'Desconectado';
      case 'error': return `Erro: ${errorMessage || 'Desconhecido'}`;
      case 'paused': return 'Transmissão Pausada';
      default: return 'Status Desconhecido';
    }
  };

  // Ações de controle (placeholder)
  const handlePauseStream = () => { 
    setStatus('paused'); 
    console.log("Pausar stream (simulado)");
    // Enviar comando para backend/app de captura
  };
  const handleResumeStream = () => { 
    setStatus('streaming');
    console.log("Retomar stream (simulado)");
    // Enviar comando para backend/app de captura
  };
  const handleStopStream = () => { 
    setStatus('disconnected'); 
    setBitrate(0);
    setLatency(0);
    console.log("Parar stream (simulado)");
    // Enviar comando para backend/app de captura
  };


  return (
    <div className="p-4 bg-gray-700 rounded-lg shadow">
      <div className="flex justify-between items-center mb-3">
        <h3 className={`text-lg font-semibold ${getStatusColor()}`}>
          {getStatusText()}
        </h3>
        {/* Ícone de status (poderia ser um SVG animado) */}
        {status === 'streaming' && <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>}
        {status === 'connecting' && <div className="w-3 h-3 bg-yellow-500 rounded-full animate-ping"></div>}
        {status === 'error' && <div className="w-3 h-3 bg-red-500 rounded-full"></div>}
      </div>

      {errorMessage && status === 'error' && (
        <p className="text-red-300 text-sm mb-2">{errorMessage}</p>
      )}

      {(status === 'connected' || status === 'streaming' || status === 'paused') && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Bitrate:</span>
            <span className="text-gray-200 ml-1">{bitrate > 0 ? `${bitrate} kbps` : 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-400">Latência:</span>
            <span className="text-gray-200 ml-1">{latency > 0 ? `${latency} ms` : 'N/A'}</span>
          </div>
        </div>
      )}
      
      {/* Botões de Controle (Exemplo) */}
      <div className="mt-4 flex space-x-2">
        {status === 'streaming' && (
            <button onClick={handlePauseStream} className="bg-yellow-600 hover:bg-yellow-700 text-white py-1 px-3 rounded text-sm">Pausar</button>
        )}
        {status === 'paused' && (
            <button onClick={handleResumeStream} className="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-sm">Retomar</button>
        )}
        {(status === 'streaming' || status === 'paused' || status === 'connected') && (
            <button onClick={handleStopStream} className="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm">Parar</button>
        )}
         {status === 'disconnected' && (
            <button onClick={() => setStatus('connecting')} className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm">Conectar App</button>
        )}
      </div>
       <p className="text-xs text-gray-500 mt-3">
        Este painel reflete o status da conexão entre o App de Captura Nakama e o servidor.
      </p>
    </div>
  );
};

export default StreamingStatus;
