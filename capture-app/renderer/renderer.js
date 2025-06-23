// capture-app/renderer/renderer.js
document.addEventListener('DOMContentLoaded', () => {
    const sessionIdInput = document.getElementById('session-id');
    const jwtTokenInput = document.getElementById('jwt-token');
    const audioDeviceSelect = document.getElementById('audio-device-select');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    
    const statusIndicator = document.getElementById('status-indicator');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const sessionInfoDisplay = document.getElementById('session-info');
    
    const startStreamBtn = document.getElementById('start-stream-btn');
    const stopStreamBtn = document.getElementById('stop-stream-btn');
    const messagesLog = document.getElementById('messages-log');

    let currentSessionId = '';
    let currentJwtToken = '';
    let currentSelectedDeviceId = '';
    let isCurrentlyStreaming = false;

    function logMessage(type, text) {
        const p = document.createElement('p');
        p.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
        p.className = `message-${type}`; // error, warning, info, success
        messagesLog.appendChild(p);
        messagesLog.scrollTop = messagesLog.scrollHeight; // Auto-scroll
        console[type === 'error' ? 'error' : 'log'](text);
    }
    
    // Carregar dispositivos de áudio ao iniciar
    async function loadAudioDevices() {
        try {
            logMessage('info', 'Carregando dispositivos de áudio...');
            const devices = await window.electronAPI.getAudioDevices();
            audioDeviceSelect.innerHTML = '<option value="">-- Selecione um dispositivo --</option>'; // Limpar opções antigas
            if (devices && devices.length > 0) {
                devices.forEach(device => {
                    if (device.kind === 'audioinput') { // Listar apenas dispositivos de entrada
                        const option = document.createElement('option');
                        option.value = device.deviceId; // Usar deviceId real
                        option.textContent = device.label || `Dispositivo ${device.deviceId.substring(0,8)}`;
                        audioDeviceSelect.appendChild(option);
                    }
                });
                logMessage('info', `${devices.filter(d=>d.kind === 'audioinput').length} dispositivos de entrada encontrados.`);
            } else {
                logMessage('warning', 'Nenhum dispositivo de áudio de entrada encontrado.');
                audioDeviceSelect.innerHTML = '<option value="">Nenhum dispositivo encontrado</option>';
            }
        } catch (error) {
            logMessage('error', `Erro ao carregar dispositivos de áudio: ${error.message}`);
            audioDeviceSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    loadAudioDevices();

    // Salvar configurações (placeholder, idealmente persistir com electron-store via main process)
    saveSettingsBtn.addEventListener('click', () => {
        currentSessionId = sessionIdInput.value.trim();
        currentJwtToken = jwtTokenInput.value.trim(); // Em uma app real, NUNCA armazenar JWT assim se houver alternativas
        currentSelectedDeviceId = audioDeviceSelect.value;

        if (!currentSessionId) {
            logMessage('warning', 'ID da Sessão não pode estar vazio.');
            return;
        }
        if (!currentJwtToken) {
            logMessage('warning', 'Token JWT não pode estar vazio.');
            // Em uma app real, o login seria feito via OAuth no browser aberto pelo Electron,
            // e o token seria recebido via deep linking ou IPC, não inserido manualmente.
            return;
        }
        if (!currentSelectedDeviceId) {
            logMessage('warning', 'Selecione um dispositivo de áudio.');
            return;
        }

        const settings = {
            sessionId: currentSessionId,
            jwtToken: currentJwtToken,
            selectedDeviceId: currentSelectedDeviceId,
        };
        
        window.electronAPI.saveSettings(settings); // Envia para o main process
        logMessage('info', 'Configurações enviadas para o processo principal.');
        // Aguardar confirmação do main process via onSettingsSavedAck
    });

    // Lógica dos botões de stream
    startStreamBtn.addEventListener('click', () => {
        if (!currentSessionId || !currentJwtToken) {
            logMessage('error', 'ID da Sessão ou Token JWT não estão configurados. Salve as configurações primeiro.');
            return;
        }
        if (isCurrentlyStreaming) {
            logMessage('warning', 'Transmissão já está ativa.');
            return;
        }
        logMessage('info', `Iniciando transmissão para sessão: ${currentSessionId}...`);
        window.electronAPI.startStream({ sessionId: currentSessionId, jwtToken: currentJwtToken });
        // O status será atualizado pelo evento 'streaming-status' do main process
    });

    stopStreamBtn.addEventListener('click', () => {
        if (!isCurrentlyStreaming) {
            logMessage('warning', 'Nenhuma transmissão ativa para parar.');
            return;
        }
        logMessage('info', 'Parando transmissão...');
        window.electronAPI.stopStream();
        // O status será atualizado pelo evento 'streaming-status' do main process
    });

    function updateStreamingUI(statusData) {
        if (statusData.status === 'streaming' || statusData.status === 'connected' || statusData.status === 'connecting') {
            isCurrentlyStreaming = true;
            statusIndicator.className = 'status-connected'; // Usar classes para diferentes status
            statusDot.style.backgroundColor = '#28a745'; // Verde
            statusText.textContent = statusData.status === 'streaming' ? `Transmitindo para ${statusData.sessionId || currentSessionId}` : 'Conectado';
            startStreamBtn.disabled = true;
            stopStreamBtn.disabled = false;
            sessionInfoDisplay.textContent = `Sessão Ativa: ${statusData.sessionId || currentSessionId}`;
            if (statusData.status === 'connecting') {
                statusText.textContent = 'Conectando...';
                statusDot.style.backgroundColor = '#ffc107'; // Amarelo
            }
        } else { // disconnected, error, etc.
            isCurrentlyStreaming = false;
            statusIndicator.className = 'status-disconnected';
            statusDot.style.backgroundColor = '#dc3545'; // Vermelho
            statusText.textContent = statusData.status === 'error' ? `Erro: ${statusData.message || 'Desconectado'}` : 'Desconectado';
            startStreamBtn.disabled = false;
            stopStreamBtn.disabled = true;
            sessionInfoDisplay.textContent = 'Nenhuma sessão ativa.';
             if (statusData.status === 'error') {
                logMessage('error', `Erro de streaming: ${statusData.message}`);
            }
        }
        // Habilitar/desabilitar botões com base nas configurações
        startStreamBtn.disabled = isCurrentlyStreaming || !currentSessionId || !currentJwtToken;
        stopStreamBtn.disabled = !isCurrentlyStreaming;
    }
    
    // Ouvir eventos do processo principal
    window.electronAPI.onStreamingStatus((statusData) => {
        logMessage('info', `Status da transmissão atualizado: ${statusData.status}`);
        updateStreamingUI(statusData);
    });

    window.electronAPI.onShowError((message) => {
        logMessage('error', message);
        updateStreamingUI({ status: 'error', message: message });
    });
    window.electronAPI.onShowWarning((message) => {
        logMessage('warning', message);
    });
    window.electronAPI.onShowInfo((message) => {
        logMessage('info', message);
    });
    window.electronAPI.onSettingsSavedAck((result) => {
        if (result.success) {
            logMessage('success', 'Configurações salvas com sucesso no processo principal!');
            // Habilitar botão de iniciar stream se tudo estiver OK
            startStreamBtn.disabled = !currentSessionId || !currentJwtToken || isCurrentlyStreaming;
        } else {
            logMessage('error', `Falha ao salvar configurações: ${result.error || 'Erro desconhecido'}`);
        }
    });

    // Estado inicial dos botões
    startStreamBtn.disabled = true; // Desabilitado até que as configs sejam salvas
    stopStreamBtn.disabled = true;

    // Carregar configurações salvas (se houver, do electron-store via main process)
    // Exemplo: window.electronAPI.loadSettings().then(settings => { ... });
    // Por agora, o usuário precisa inserir manualmente.

    logMessage('info', 'Renderer do App de Captura Nakama carregado.');
});

// Limpar listeners ao descarregar a página (embora no Electron isso seja menos comum)
window.onbeforeunload = () => {
    // window.electronAPI.removeAllListeners('streaming-status');
    // window.electronAPI.removeAllListeners('show-error');
    // ... etc. para todos os listeners registrados
    // No entanto, o preload.js é recarregado com a página, então os listeners antigos
    // do ipcRenderer devem ser limpos automaticamente. A questão é mais sobre listeners
    // que o main process possa ter para *esta* janela específica.
};
