/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				'sw-bg': '#0a0e17',
				'sw-surface': '#111827',
				'sw-border': '#1f2937',
				'sw-accent': '#10b981',
				'sw-accent-dim': '#059669',
				'sw-warning': '#f59e0b',
				'sw-danger': '#ef4444',
				'sw-text': '#f9fafb',
				'sw-text-dim': '#9ca3af',
				'sw-purple': '#8b5cf6',
				'sw-blue': '#3b82f6'
			},
			fontFamily: {
				'display': ['Inter', 'system-ui', 'sans-serif'],
				'body': ['Inter', 'system-ui', 'sans-serif'],
				'mono': ['JetBrains Mono', 'monospace']
			},
			backgroundImage: {
				'grid-pattern': 'linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px)',
				'glow-radial': 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.15) 0%, transparent 70%)'
			},
			backgroundSize: {
				'grid': '40px 40px'
			},
			animation: {
				'fade-in': 'fadeIn 0.5s ease-out',
				'slide-up': 'slideUp 0.4s ease-out',
				'pulse-glow': 'pulseGlow 2s ease-in-out infinite'
			},
			keyframes: {
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' }
				},
				slideUp: {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				pulseGlow: {
					'0%, 100%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' },
					'50%': { boxShadow: '0 0 40px rgba(16, 185, 129, 0.5)' }
				}
			}
		}
	},
	plugins: []
};
