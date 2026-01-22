/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				'sw-bg': 'var(--sw-bg)',
				'sw-surface': 'var(--sw-surface)',
				'sw-border': 'var(--sw-border)',
				'sw-accent': 'var(--sw-accent)',
				'sw-accent-dim': 'var(--sw-accent-dim)',
				'sw-gold': 'var(--sw-gold)',
				'sw-warning': '#f59e0b',
				'sw-danger': '#ef4444',
				'sw-text': 'var(--sw-text)',
				'sw-text-dim': 'var(--sw-text-dim)',
				'sw-text-warm': 'var(--sw-text-warm)',
				'sw-purple': '#a78bfa',
				'sw-blue': '#60a5fa'
			},
			fontFamily: {
				'display': ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
				'body': ['Inter', 'system-ui', 'sans-serif'],
				'mono': ['JetBrains Mono', 'monospace']
			},
		backgroundImage: {
			'grid-pattern': 'linear-gradient(rgba(76, 175, 80, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(76, 175, 80, 0.03) 1px, transparent 1px)',
			'glow-radial': 'radial-gradient(ellipse at center, rgba(76, 175, 80, 0.15) 0%, transparent 70%)'
		},
			backgroundSize: {
				'grid': '40px 40px'
			},
			animation: {
				'fade-in': 'fadeIn 0.5s ease-out',
				'slide-up': 'slideUp 0.4s ease-out',
				'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
				'float-slow': 'floatSlow 6s ease-in-out infinite',
				'float-medium': 'floatMedium 5s ease-in-out infinite',
				'float-fast': 'floatFast 4s ease-in-out infinite'
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
				'0%, 100%': { boxShadow: '0 0 20px rgba(56, 142, 60, 0.3)' },
				'50%': { boxShadow: '0 0 40px rgba(56, 142, 60, 0.5)' }
			},
				floatSlow: {
					'0%, 100%': { transform: 'translateY(0) rotate(-1deg)' },
					'50%': { transform: 'translateY(-12px) rotate(1deg)' }
				},
				floatMedium: {
					'0%, 100%': { transform: 'translateY(0) rotate(1deg)' },
					'50%': { transform: 'translateY(-16px) rotate(-1deg)' }
				},
				floatFast: {
					'0%, 100%': { transform: 'translateY(0) rotate(0.5deg)' },
					'50%': { transform: 'translateY(-10px) rotate(-0.5deg)' }
				}
			}
		}
	},
	plugins: []
};
