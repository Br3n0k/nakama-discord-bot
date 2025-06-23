import React, { useState, useEffect } from 'react';

interface AudioDevice {
  id: string;
  label: string;
}

const AudioDeviceSelector: React.FC = () => {
  const [inputDevices, setInputDevices] = useState<AudioDevice[]>([]);
  // const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]); // Se necessário listar saídas
  const [selectedInputDevice, setSelectedInputDevice] = useState<string>('');
  // const [selectedOutputDevice, setSelectedOutputDevice] = useState<string>('');

  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        // Solicitar permissão para acessar dispositivos de mídia
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
        // const audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');

        setInputDevices(audioInputDevices.map(device => ({ id: device.deviceId, label: device.label || `Input Device ${device.deviceId.substring(0,8)}` })));
        // setOutputDevices(audioOutputDevices.map(device => ({ id: device.deviceId, label: device.label || `Output Device ${device.deviceId.substring(0,8)}` })));

        // Tenta selecionar o dispositivo padrão se nenhum estiver selecionado
        if (audioInputDevices.length > 0) {
            const defaultDevice = audioInputDevices.find(d => d.deviceId === 'default');
            if (defaultDevice) {
                setSelectedInputDevice(defaultDevice.deviceId);
            } else {
                setSelectedInputDevice(audioInputDevices[0].deviceId);
            }
        }

      } catch (err) {
        console.error('Erro ao listar dispositivos de áudio:', err);
        // Informar ao usuário que a permissão é necessária ou houve um erro
        alert("Não foi possível acessar os dispositivos de áudio. Verifique as permissões do seu navegador.");
      }
    };

    getAudioDevices();

    // Listener para mudanças nos dispositivos (ex: conectar/desconectar microfone)
    navigator.mediaDevices.addEventListener('devicechange', getAudioDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getAudioDevices);
    };
  }, []);

  const handleInputDeviceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedInputDevice(event.target.value);
    // Aqui você pode querer salvar a preferência do usuário (localStorage)
    // ou notificar o App de Captura sobre a mudança de dispositivo,
    // dependendo de como o App de Captura é controlado (via WebSocket ou config local).
    console.log("Dispositivo de entrada selecionado:", event.target.value);
  };

  return (
    <div className="p-4 bg-gray-700 rounded-lg shadow">
      <div className="mb-4">
        <label htmlFor="audio-input-select" className="block text-sm font-medium text-gray-300 mb-1">
          Dispositivo de Entrada de Áudio:
        </label>
        {inputDevices.length > 0 ? (
          <select
            id="audio-input-select"
            value={selectedInputDevice}
            onChange={handleInputDeviceChange}
            className="w-full bg-gray-800 text-gray-200 border border-gray-600 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500"
          >
            {inputDevices.map(device => (
              <option key={device.id} value={device.id}>
                {device.label}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-gray-400 text-sm">Nenhum dispositivo de entrada de áudio encontrado ou permissão negada.</p>
        )}
      </div>
      {/* Seletor de dispositivo de saída, se necessário
      <div className="mb-4">
        <label htmlFor="audio-output-select" className="block text-sm font-medium text-gray-300 mb-1">
          Dispositivo de Saída de Áudio (para o bot):
        </label>
        <select
            id="audio-output-select"
            value={selectedOutputDevice}
            onChange={(e) => setSelectedOutputDevice(e.target.value)}
            className="w-full bg-gray-800 text-gray-200 border border-gray-600 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500"
        >
            {outputDevices.map(device => (
            <option key={device.id} value={device.id}>
                {device.label}
            </option>
            ))}
        </select>
      </div>
      */}
      <p className="text-xs text-gray-500 mt-2">
        Este seletor é para o App de Captura Nakama. Certifique-se de que o app está configurado para usar o dispositivo selecionado.
        A listagem de dispositivos aqui é baseada nas permissões do navegador e pode não refletir diretamente o que o App de Captura está usando se ele for standalone.
      </p>
    </div>
  );
};

export default AudioDeviceSelector;
