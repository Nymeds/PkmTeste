/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{html,js,jsx}",
      "./src/renderer/**/*.{html,js,jsx}"
    ],
    theme: {
      extend: {
        colors: {
          electric: '#F4D03F',
          fire: '#F08030',
          water: '#6890F0',
          grass: '#78C850',
          dragon: '#F16E57',
          poison: '#A040A0',
          flying: '#A890F0'
        },
        animation: {
          'bounce-slow': 'bounce 3s infinite',
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'wiggle': 'wiggle 1s ease-in-out infinite',
        },
        keyframes: {
          wiggle: {
            '0%, 100%': { transform: 'rotate(-3deg)' },
            '50%': { transform: 'rotate(3deg)' },
          }
        }
      },
    },
    plugins: [],
  }