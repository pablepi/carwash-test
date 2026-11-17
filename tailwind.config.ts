import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './tenants/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: {
          darkest: 'var(--apple-bg-base, #000000)',
          elevated: 'var(--apple-bg-elevated, #161618)',
          card: 'var(--apple-bg-card, #161618)',
          surface: 'var(--apple-bg-surface, #1C1C1E)',
          hover: 'var(--apple-bg-hover, #2C2C2E)',
          border: 'var(--apple-border-subtle, rgba(255, 255, 255, 0.08))',
          'border-strong': 'var(--apple-border-medium, rgba(255, 255, 255, 0.14))',
        },
        accent: {
          blue: 'var(--apple-accent-blue, #00C7BE)',
          turquoise: 'var(--apple-accent-turquoise, #00C7BE)',
          'blue-hover': 'var(--apple-accent-blue-hover, #00B3AB)',
          'turquoise-hover': 'var(--apple-accent-turquoise-hover, #00B3AB)',
          'blue-subtle': 'var(--apple-accent-blue-subtle, rgba(0, 199, 190, 0.15))',
          'turquoise-subtle': 'var(--apple-accent-turquoise-subtle, rgba(0, 199, 190, 0.15))',
        },
        text: {
          primary: 'var(--apple-text-primary, #F5F5F7)',
          secondary: 'var(--apple-text-secondary, #86868B)',
          tertiary: 'var(--apple-text-tertiary, #A1A1A6)',
          muted: 'var(--apple-text-muted, #6E6E73)',
        },
        status: {
          pending: '#F59E0B',
          progress: '#00C7BE',
          completed: '#34C759',
          cancelled: '#FF453A',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"SF Pro"',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      letterSpacing: {
        tightest: '-0.03em',
        tight: '-0.02em',
      },
      boxShadow: {
        'apple-card': '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'apple-glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'blue-trigger': '0 0 20px -2px rgba(0, 199, 190, 0.5)',
        'turquoise-trigger': '0 0 20px -2px rgba(0, 199, 190, 0.5)',
      },
    },
  },
  plugins: [],
} satisfies Config;
