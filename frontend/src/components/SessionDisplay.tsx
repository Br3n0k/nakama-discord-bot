import React, { useState } from 'react';

interface User {
  username: string;
  avatarUrl?: string;
}

interface Session {
  sessionId: string;
  user?: User; // User pode ser opcional dependendo de quando carregamos
  isActive: boolean;
  expiresAt: string; // ISO string date
}

interface SessionDisplayProps {
  session: Session | null; // Pode ser nulo se não houver sessão ou estiver carregando
}

const SessionDisplay: React.FC<SessionDisplayProps> = ({ session }) => {
  const [copied, setCopied] = useState(false);

  if (!session) {
    return (
      <div className="p-4 bg-gray-700 rounded-lg text-center">
        <p className="text-gray-400">Carregando dados da sessão...</p>
      </div>
    );
  }

  const { sessionId, user, isActive, expiresAt } = session;

  const handleCopySessionId = () => {
    navigator.clipboard.writeText(sessionId)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset copied status after 2s
      })
      .catch(err => {
        console.error('Falha ao copiar ID da sessão:', err);
        alert('Não foi possível copiar o ID da sessão.');
      });
  };

  const timeRemaining = () => {
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();

    if (diff <= 0) return "Expirada";

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s restantes`;
  };

  return (
    <div className="p-4 bg-gray-700 rounded-lg shadow">
      {user && (
        <div className="flex items-center mb-3">
          {user.avatarUrl && (
            <img src={user.avatarUrl} alt={user.username} className="w-10 h-10 rounded-full mr-3" />
          )}
          <span className="text-lg font-semibold text-gray-200">{user.username}</span>
        </div>
      )}
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-400">ID da Sessão:</label>
        <div className="flex items-center mt-1">
          <input
            type="text"
            value={sessionId}
            readOnly
            className="w-full bg-gray-800 text-gray-300 border border-gray-600 rounded-l-md p-2 focus:ring-purple-500 focus:border-purple-500"
          />
          <button
            onClick={handleCopySessionId}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-r-md"
            title="Copiar ID da Sessão"
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>
      <div className="mb-2">
        <p className="text-sm text-gray-400">
          Status: <span className={isActive ? "text-green-400" : "text-red-400"}>{isActive ? 'Ativa' : 'Inativa'}</span>
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-400">
          Expira em: <span className="text-gray-300">{timeRemaining()}</span> ({new Date(expiresAt).toLocaleString()})
        </p>
      </div>
    </div>
  );
};

export default SessionDisplay;
