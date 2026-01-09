import type { Config } from 'tailwindcss'

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                turbo: {
                    blue: '#3b82f6',
                    dark: '#0f172a',
                    surface: 'rgba(30, 41, 59, 0.7)',
                    border: 'rgba(255, 255, 255, 0.1)',
                }
            },
            animation: {
                'fade-in': 'fadeIn 0.8s ease-out',
                'scale-in': 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                'pulse-slow': 'pulse 2s infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.9)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                }
            }
        },
    },
    plugins: [],
} satisfies Config
