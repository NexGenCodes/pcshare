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
                background: 'var(--background)',
                foreground: 'var(--foreground)',
                surface: 'var(--surface)',
                border: 'var(--border)',
                accent: {
                    success: 'var(--accent-success)',
                    warning: 'var(--accent-warning)',
                    error: 'var(--accent-error)',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
} satisfies Config
