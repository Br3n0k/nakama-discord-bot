import React, { useState, useEffect } from 'react';

interface AudioDevice {
  id: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

interface AudioDeviceSelectorProps {
  sessionId: string;
  isConnectedToBot: boolean;
  onDeviceChange?: (deviceId: string) => void;
}

const AudioDeviceSelector: React.FC<AudioDeviceSelectorProps> = ({ 
  sessionId, 
  isConnectedToBot, 
  onDeviceChange 
}) => {
  const [inputDevices, setInputDevices] = useState<AudioDevice[]>([]);
  const [selectedInputDevice, setSelectedInputDevice] = useState<string>('');
  const [captureAppConnected, setCaptureAppConnected] = useState<boolean>(false);
  const [permissions, setPermissions] = useState<boolean>(false);

  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        // Solicitar permissão para acessar dispositivos de mídia
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Parar o stream, só queríamos a permissão
        setPermissions(true);
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputDevices = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            id: device.deviceId,
            label: device.label || `Dispositivo de Áudio ${device.deviceId.substring(0,8)}...`,
            kind: 'audioinput' as const
          }));

        setInputDevices(audioInputDevices);

        // Selecionar dispositivo padrão
        if (audioInputDevices.length > 0 && !selectedInputDevice) {
          const defaultDevice = audioInputDevices.find(d => d.id === 'default') || audioInputDevices[0];
          setSelectedInputDevice(defaultDevice.id);
        }

      } catch (err) {
        console.error('Erro ao listar dispositivos de áudio:', err);
        setPermissions(false);
      }
    };

    getAudioDevices();

    // Listener para mudanças nos dispositivos
    navigator.mediaDevices.addEventListener('devicechange', getAudioDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getAudioDevices);
    };
  }, [selectedInputDevice]);

  // Verificar se o Capture App está conectado
  useEffect(() => {
    const checkCaptureAppStatus = async () => {
      try {
        const response = await fetch('/api/audio/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setCaptureAppConnected(data.captureAppConnected || false);
        }
      } catch (err) {
        console.log('Capture App não conectado');
        setCaptureAppConnected(false);
      }
    };

    if (sessionId) {
      checkCaptureAppStatus();
      const interval = setInterval(checkCaptureAppStatus, 3000); // Verificar a cada 3s
      return () => clearInterval(interval);
    }
  }, [sessionId]);

  const handleInputDeviceChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = event.target.value;
    setSelectedInputDevice(deviceId);
    
    // Salvar preferência localmente
    localStorage.setItem('nakama_selected_audio_device', deviceId);
    
    // Notificar componente pai
    onDeviceChange?.(deviceId);
    
    // Enviar configuração para o Capture App via backend
    try {
      await fetch('/api/audio/device-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          selectedDeviceId: deviceId
        }),
        credentials: 'include'
      });
    } catch (err) {
      console.error('Erro ao configurar dispositivo no Capture App:', err);
    }
  };

  const startCaptureApp = () => {
    // Instruções para o usuário baixar/abrir o Capture App
    const instructions = `
Para iniciar a captura de áudio:

1. Baixe o Nakama Capture App (se ainda não tiver)
2. Abra o aplicativo
3. Cole sua Session ID: ${sessionId}
4. O app se conectará automaticamente

O dispositivo selecionado: ${inputDevices.find(d => d.id === selectedInputDevice)?.label}
    `;
    
    alert(instructions);
  };

  if (!permissions) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg">
        <h3 className="text-red-400 font-semibold mb-2">⚠️ Permissões Necessárias</h3>
        <p className="text-red-300 text-sm mb-3">
          Para selecionar dispositivos de áudio, precisamos de permissão para acessar seu microfone.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status de Conexões */}
      <div className="flex gap-4 text-sm">
        <div className={`flex items-center gap-2 ${isConnectedToBot ? 'text-green-400' : 'text-gray-400'}`}>
          <div className={`w-2 h-2 rounded-full ${isConnectedToBot ? 'bg-green-400' : 'bg-gray-400'}`}></div>
          Discord Bot {isConnectedToBot ? 'Conectado' : 'Desconectado'}
        </div>
        <div className={`flex items-center gap-2 ${captureAppConnected ? 'text-green-400' : 'text-gray-400'}`}>
          <div className={`w-2 h-2 rounded-full ${captureAppConnected ? 'bg-green-400' : 'bg-gray-400'}`}></div>
          Capture App {captureAppConnected ? 'Conectado' : 'Desconectado'}
        </div>
      </div>

      {/* Seletor de Dispositivo */}
      <div>
        <label htmlFor="audio-input-select" className="block text-sm font-medium text-gray-300 mb-2">
          🎤 Dispositivo de Entrada de Áudio
        </label>
        {inputDevices.length > 0 ? (
          <select
            id="audio-input-select"
            value={selectedInputDevice}
            onChange={handleInputDeviceChange}
            className="w-full bg-gray-800 text-gray-200 border border-gray-600 rounded-md p-3 focus:ring-purple-500 focus:border-purple-500"
            disabled={!isConnectedToBot && !captureAppConnected}
          >
            {inputDevices.map(device => (
              <option key={device.id} value={device.id}>
                {device.label}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-gray-400 text-sm bg-gray-800 p-3 rounded-md">
            Nenhum dispositivo de entrada encontrado
          </p>
        )}
      </div>

      {/* Instruções e Status */}
      {!captureAppConnected && (
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
          <h4 className="text-yellow-400 font-semibold mb-2">📱 Capture App Necessário</h4>
          <p className="text-yellow-300 text-sm mb-3">
            Para transmitir áudio, você precisa do Nakama Capture App rodando no seu PC.
          </p>
          <button 
            onClick={startCaptureApp}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm"
          >
            Ver Instruções
          </button>
        </div>
      )}

      {isConnectedToBot && captureAppConnected && (
        <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
          <h4 className="text-green-400 font-semibold mb-2">✅ Pronto para Transmitir!</h4>
          <p className="text-green-300 text-sm">
            Bot Discord conectado e Capture App ativo. O áudio do dispositivo "<strong>{inputDevices.find(d => d.id === selectedInputDevice)?.label}</strong>" será transmitido para o canal de voz.
          </p>
        </div>
      )}

      {/* Informações Técnicas */}
      <div className="text-xs text-gray-500 bg-gray-800/50 p-3 rounded">
        <p><strong>Session ID:</strong> {sessionId}</p>
        <p><strong>Dispositivo Selecionado:</strong> {inputDevices.find(d => d.id === selectedInputDevice)?.label || 'Nenhum'}</p>
        <p><strong>Status:</strong> {
          isConnectedToBot && captureAppConnected ? 'Transmitindo' :
          isConnectedToBot ? 'Bot pronto, aguardando Capture App' :
          captureAppConnected ? 'Capture App pronto, use /music no Discord' :
          'Aguardando conexões'
        }</p>
      </div>
    </div>
  );
};

export default AudioDeviceSelector;
