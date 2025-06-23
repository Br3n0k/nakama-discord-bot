import React, { useState } from 'react';

interface User {
  username: string;
  avatarUrl?: string;
}

interface NavbarProps {
  user: User | null; // Usuário pode ser nulo se não estiver logado
}

const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    // Lógica de logout:
    // 1. Chamar endpoint de logout no backend (ex: POST /api/auth/logout)
    //    - Backend deve invalidar o JWT/sessão (ex: adicionar à blacklist, remover de Redis)
    // 2. Limpar quaisquer tokens/cookies do lado do cliente
    // 3. Redirecionar para a página de login ou inicial

    console.log("Fazendo logout...");
    // Exemplo:
    // await fetch('/api/auth/logout', { method: 'POST' });
    // document.cookie = 'nakama_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;'; // Clear cookie
    alert("Simulando logout. Em uma app real, a sessão seria invalidada e você seria redirecionado.");
    window.location.href = '/'; // Redireciona para a landing page
  };

  return (
    <nav className="bg-gray-900 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo e Nome do Projeto */}
          <a href="/" className="flex items-center space-x-2">
            {/* Substituir por um SVG ou Imagem do Logo */}
            <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.636 5.636a9 9 0 0112.728 0M18.364 5.636a9 9 0 00-12.728 0m12.728 0l-2.829 2.828m0 0a5 5 0 00-7.072 0m7.072 0l2.829 2.829M3 12h18" />
            </svg>
            <span className="text-2xl font-bold text-purple-400 hover:text-purple-300 transition">
              Nakama
            </span>
          </a>

          {/* Links de Navegação (se houver mais páginas no dashboard) */}
          <div className="hidden md:flex space-x-4">
            <a href="/dashboard" className="hover:text-purple-300 px-3 py-2 rounded-md text-sm font-medium">Dashboard</a>
            {/* <a href="/docs" className="hover:text-purple-300 px-3 py-2 rounded-md text-sm font-medium">Documentação</a> */}
            {/* Adicionar mais links conforme necessário */}
          </div>

          {/* Informações do Usuário e Logout */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 focus:outline-none p-2 rounded-md hover:bg-gray-800"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.username} className="w-8 h-8 rounded-full" />
                ) : (
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-700">
                    <span className="text-sm font-medium leading-none text-white">{user.username.charAt(0).toUpperCase()}</span>
                  </span>
                )}
                <span className="hidden md:inline text-sm">{user.username}</span>
                <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50">
                  {/* <a href="/profile" className="block px-4 py-2 text-sm text-gray-200 hover:bg-purple-600 hover:text-white">Perfil</a> */}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-purple-600 hover:text-white"
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a href="/login" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition duration-300">
              Login com Discord
            </a>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
