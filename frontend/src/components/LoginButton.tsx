import React from 'react';

const LoginButton: React.FC = () => {
  const handleLogin = async () => {
    // Em uma aplicação real, esta função faria uma requisição
    // para o endpoint de backend que inicia o fluxo OAuth2 do Discord.
    // Ex: POST /api/auth/discord
    // O backend então redirecionaria o browser do usuário para a URL de autorização do Discord.

    // Simulação:
    console.log("Iniciando login com Discord...");
    // window.location.href = '/api/auth/discord'; // Ou a URL direta do backend
    // Como /api/auth/discord é um POST, normalmente seria um <form> ou um fetch.
    // Para simplificar o placeholder, vamos simular um clique que levaria a /login
    // que por sua vez poderia ter a lógica de redirecionamento ou ser o target do form.
    
    // Se o backend /auth/discord espera um POST e redireciona:
    try {
      // const response = await fetch('/api/auth/discord', { // Ajuste para a URL correta do seu backend
      //   method: 'POST',
      // });
      // if (response.ok && response.redirected) {
      //   window.location.href = response.url;
      // } else {
      //   // Tratar erro, talvez o backend retorne uma URL de login em JSON
      //   const data = await response.json();
      //   if (data.redirectUrl) {
      //     window.location.href = data.redirectUrl;
      //   } else {
      //     console.error('Falha ao iniciar login:', data.message || 'Erro desconhecido');
      //     alert('Não foi possível iniciar o login com o Discord. Tente novamente.');
      //   }
      // }
      alert("Simulando clique no botão de login. Em uma app real, isso redirecionaria para o Discord via backend.");
      // Para fins de navegação no placeholder, vamos para /login (que não faz nada ainda)
      window.location.href = '/login'; 

    } catch (error) {
      console.error('Erro ao tentar logar:', error);
      alert('Ocorreu um erro ao tentar conectar com o Discord.');
    }
  };

  return (
    <button
      onClick={handleLogin}
      className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center"
    >
      {/* Ícone do Discord (SVG ou Font Awesome) */}
      <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        {/* Placeholder de ícone, idealmente usar um SVG real do Discord */}
        <path d="M20.317 4.36981C18.2751 3.01006 15.936 2.09021 13.4989 1.80225C13.4271 1.89406 13.3633 1.99387 13.3076 2.09769C11.9125 1.74906 10.4422 1.85906 9.10604 2.39687C8.8903 2.31312 8.66858 2.23537 8.44089 2.16969C8.44089 2.16969 8.39301 2.15344 8.37905 2.14937C4.68691 3.48062 2.40941 6.47812 1.97158 9.57875C1.97158 9.57875 1.9516 9.7125 1.9516 9.72062C1.81982 11.5747 2.25161 13.3438 3.20004 14.935C3.20004 14.935 3.216 14.9512 3.22402 14.9634C4.08436 16.3231 5.26157 17.3931 6.62004 18.2216C6.62004 18.2216 6.64003 18.2319 6.65205 18.2378C7.92804 19.3819 9.65205 20.3138 11.6006 20.9934C11.6006 20.9934 11.6206 21.0016 11.6326 21.0056C12.5006 21.2334 13.3886 21.3334 14.2846 21.3016C14.2846 21.3016 14.8606 21.2697 14.8846 21.2656C18.5925 20.4312 21.1325 17.8087 21.9525 14.4184C21.9525 14.4184 21.9685 14.3684 21.9725 14.3562C22.3805 12.535 22.2885 10.6916 21.6725 8.96844C21.6725 8.96844 21.6565 8.92469 21.6405 8.9125C20.9525 6.99031 19.8125 5.34406 18.2485 4.10656C18.2485 4.10656 18.2325 4.09437 18.2245 4.08625L20.317 4.36981ZM9.48455 15.0097C8.39255 15.0097 7.50055 14.1177 7.50055 13.0257C7.50055 11.9337 8.39255 11.0417 9.48455 11.0417C10.5766 11.0417 11.4686 11.9337 11.4686 13.0257C11.4686 14.1177 10.5766 15.0097 9.48455 15.0097ZM15.5166 15.0097C14.4246 15.0097 13.5326 14.1177 13.5326 13.0257C13.5326 11.9337 14.4246 11.0417 15.5166 11.0417C16.6086 11.0417 17.5006 11.9337 17.5006 13.0257C17.5006 14.1177 16.6086 15.0097 15.5166 15.0097Z"/>
      </svg>
      Entrar com Discord
    </button>
  );
};

export default LoginButton;
