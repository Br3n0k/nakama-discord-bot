/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class', // Ou 'media' se preferir baseado nas configurações do OS
  theme: {
    extend: {
      colors: {
        // Cores inspiradas em neon/pixel art (tema retro-tech)
        // Exemplo de paleta:
        primary: {
          light: '#7F00FF', // Electric Purple
          DEFAULT: '#5F00D9',
          dark: '#3C00A0',
        },
        secondary: {
          light: '#00F0FF', // Neon Blue/Cyan
          DEFAULT: '#00C0F0',
          dark: '#00A0D0',
        },
        accent: {
          light: '#F000B0', // Neon Pink/Magenta
          DEFAULT: '#D00090',
          dark: '#B00070',
        },
        neutral: {
          // Tons de cinza escuros para o dark mode
          900: '#121212', // Quase preto
          800: '#1E1E1E',
          700: '#2C2C2C',
          600: '#3A3A3A',
          // ...outros tons conforme necessário
        },
        // Cores específicas do Discord (podem ser úteis)
        discord: {
          blurple: '#5865F2',
          green: '#57F287',
          yellow: '#FEE75C',
          red: '#ED4245',
          white: '#FFFFFF',
          gray: '#99AAB5'
        }
      },
      fontFamily: {
        // Fontes com tema retro-tech (exemplos, instalar separadamente se não forem web-safe)
        // sans: ['"Press Start 2P"', 'sans-serif'], // Pixelada
        // mono: ['"VT323"', 'monospace'], // Outra pixelada
        // Ou usar fontes mais modernas com boa legibilidade
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Fira Code"', 'monospace'],
      },
      animation: {
        // Animações com Framer Motion serão feitas em JS/TSX,
        // mas podemos ter algumas animações CSS básicas aqui.
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      // Adicionar mais extensões de tema conforme necessário (spacing, borderRadius, etc.)
    },
  },
  plugins: [
    // require('@tailwindcss/forms'), // Se for usar inputs estilizados por eles
    // require('@tailwindcss/typography'), // Para estilizar conteúdo de markdown (ex: /docs)
  ],
}
