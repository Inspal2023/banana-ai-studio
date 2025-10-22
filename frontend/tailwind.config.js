/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			colors: {
				primary: {
					50: '#FFFBEB',
					100: '#FEF3C7',
					500: '#F59E0B',
					700: '#B45309',
					900: '#78350F',
				},
				secondary: {
					100: '#DBEAFE',
					500: '#3B82F6',
					700: '#1D4ED8',
				},
				neutral: {
					50: '#FAFAF9',
					100: '#F5F5F4',
					200: '#E7E5E4',
					300: '#D4D4D8',
					600: '#52525B',
					900: '#18181B',
				},
				semantic: {
					success: '#10B981',
					warning: '#F59E0B',
					error: '#EF4444',
					info: '#3B82F6',
				},
			},
			borderRadius: {
				sm: '8px',
				md: '12px',
				lg: '16px',
				xl: '20px',
				full: '9999px',
			},
			spacing: {
				xs: '4px',
				sm: '8px',
				md: '12px',
				lg: '16px',
				xl: '20px',
				xxl: '24px',
				xxxl: '32px',
			},
			boxShadow: {
				sm: '0 1px 2px rgba(251, 191, 36, 0.1)',
				card: '0 4px 12px rgba(251, 191, 36, 0.15), 0 2px 4px rgba(59, 130, 246, 0.05)',
				'card-hover': '0 8px 24px rgba(251, 191, 36, 0.25), 0 4px 8px rgba(59, 130, 246, 0.1)',
				modal: '0 20px 40px rgba(0, 0, 0, 0.15)',
			},
			fontFamily: {
				heading: ['Quicksand', 'sans-serif'],
				body: ['Inter', 'system-ui', 'sans-serif'],
			},
			transitionDuration: {
				fast: '200ms',
				normal: '300ms',
				slow: '400ms',
			},
			keyframes: {
				'accordion-down': {
					from: { height: 0 },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: 0 },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
}
