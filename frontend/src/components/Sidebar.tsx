import React from 'react';

// Exemplo de um componente Sidebar, se for necessário para a navegação do dashboard.
// No dashboard.astro atual, ele está comentado.

interface SidebarProps {
  // Props, se necessário (ex: itens de navegação dinâmicos)
}

const Sidebar: React.FC<SidebarProps> = () => {
  // Mock de itens de navegação
  const navItems = [
    { name: 'Visão Geral', href: '/dashboard', icon: '📊' }, // Usar SVGs reais para ícones
    { name: 'Sessões Ativas', href: '/dashboard/sessions', icon: '📡' },
    { name: 'Configurações', href: '/dashboard/settings', icon: '⚙️' },
    { name: 'Ajuda', href: '/docs', icon: '❓' },
  ];

  return (
    <aside className="w-64 h-screen bg-gray-800 text-gray-300 p-4 space-y-6 hidden md:block shadow-lg">
      {/* Logo ou Nome do Projeto no Sidebar */}
      <div className="text-center py-4">
        <a href="/dashboard" className="text-xl font-semibold text-purple-400">
          Nakama Menu
        </a>
      </div>

      {/* Itens de Navegação */}
      <nav>
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.name}>
              <a
                href={item.href}
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-700 hover:text-white transition-colors duration-200"
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Informações Adicionais ou Links Úteis */}
      <div className="absolute bottom-4 left-4 right-4">
        <p className="text-xs text-gray-500">
          Nakama v0.1.0 (Placeholder)
        </p>
        {/* Pode adicionar links para status do sistema, etc. */}
      </div>
    </aside>
  );
};

export default Sidebar;
