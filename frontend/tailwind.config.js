/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	// 优化content配置，只包含需要的文件
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	// 安全性优化 - 禁用不安全的内联样式
	safelist: [
		// 动态生成的颜色类
		{
			pattern: /bg-(primary|secondary|neutral|semantic)-(50|100|200|300|500|700|900)/,
		},
		{
			pattern: /text-(primary|secondary|neutral|semantic)-(500|600|700|900)/,
		}
	],
	theme: {
		// 响应式断点优化
		screens: {
			'xs': '475px',
			'sm': '640px',
			'md': '768px',
			'lg': '1024px',
			'xl': '1280px',
			'2xl': '1536px',
		},
		container: {
			center: true,
			padding: {
				DEFAULT: '1rem',
				sm: '2rem',
				lg: '4rem',
				xl: '5rem',
				'2xl': '6rem',
			},
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			// 颜色系统 - 支持暗色模式和性能优化
			colors: {
				primary: {
					50: '#FFFBEB',
					100: '#FEF3C7',
					200: '#FDE68A',
					300: '#FCD34D',
					400: '#FBBF24',
					500: '#F59E0B',
					600: '#D97706',
					700: '#B45309',
					800: '#92400E',
					900: '#78350F',
				},
				secondary: {
					50: '#EFF6FF',
					100: '#DBEAFE',
					200: '#BFDBFE',
					300: '#93C5FD',
					400: '#60A5FA',
					500: '#3B82F6',
					600: '#2563EB',
					700: '#1D4ED8',
					800: '#1E40AF',
					900: '#1E3A8A',
				},
				neutral: {
					50: '#FAFAF9',
					100: '#F5F5F4',
					200: '#E7E5E4',
					300: '#D4D4D8',
					400: '#A8A29E',
					500: '#78716C',
					600: '#52525B',
					700: '#3F3F46',
					800: '#27272A',
					900: '#18181B',
				},
				semantic: {
					success: '#10B981',
					warning: '#F59E0B',
					error: '#EF4444',
					info: '#3B82F6',
				},
				// 性能优化的颜色变量
				'glass': {
					white: 'rgba(255, 255, 255, 0.25)',
					black: 'rgba(0, 0, 0, 0.25)',
				}
			},
			// 圆角系统
			borderRadius: {
				'none': '0',
				'sm': '4px',
				DEFAULT: '8px',
				'md': '12px',
				'lg': '16px',
				'xl': '20px',
				'2xl': '24px',
				'3xl': '32px',
				'full': '9999px',
			},
			// 间距系统 - 优化移动端体验
			spacing: {
				'18': '4.5rem',
				'88': '22rem',
				'100': '25rem',
				'104': '26rem',
				'112': '28rem',
				'128': '32rem',
			},
			// 阴影系统 - 性能优化
			boxShadow: {
				'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
				DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
				'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
				'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
				'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
				'2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
				'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
				// 自定义阴影
				'card': '0 4px 12px rgba(251, 191, 36, 0.15), 0 2px 4px rgba(59, 130, 246, 0.05)',
				'card-hover': '0 8px 24px rgba(251, 191, 36, 0.25), 0 4px 8px rgba(59, 130, 246, 0.1)',
				'modal': '0 20px 40px rgba(0, 0, 0, 0.15)',
				'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
			},
			// 字体系统 - 性能优化
			fontFamily: {
				'sans': ['Inter', 'system-ui', 'sans-serif'],
				'serif': ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
				'mono': ['Fira Code', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
				'heading': ['Quicksand', 'Inter', 'system-ui', 'sans-serif'],
				'body': ['Inter', 'system-ui', 'sans-serif'],
			},
			// 过渡时间 - 性能优化
			transitionDuration: {
				'75': '75ms',
				'100': '100ms',
				'150': '150ms',
				'200': '200ms',
				'300': '300ms',
				'500': '500ms',
				'700': '700ms',
				'1000': '1000ms',
				'fast': '150ms',
				'normal': '300ms',
				'slow': '500ms',
			},
			// 缓动函数 - 性能优化
			transitionTimingFunction: {
				DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
				'linear': 'linear',
				'in': 'cubic-bezier(0.4, 0, 1, 1)',
				'out': 'cubic-bezier(0, 0, 0.2, 1)',
				'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
				'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
				'smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
			},
			// 动画和关键帧 - 性能优化
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' },
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				'fade-out': {
					'0%': { opacity: '1', transform: 'translateY(0)' },
					'100%': { opacity: '0', transform: 'translateY(-10px)' },
				},
				'slide-in-left': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(0)' },
				},
				'slide-in-right': {
					'0%': { transform: 'translateX(100%)' },
					'100%': { transform: 'translateX(0)' },
				},
				'scale-in': {
					'0%': { transform: 'scale(0.95)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' },
				},
				'shimmer': {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' },
				},
				'pulse-soft': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.7' },
				},
				'bounce-subtle': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-5px)' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'fade-out': 'fade-out 0.3s ease-in',
				'slide-in-left': 'slide-in-left 0.3s ease-out',
				'slide-in-right': 'slide-in-right 0.3s ease-out',
				'scale-in': 'scale-in 0.2s ease-out',
				'shimmer': 'shimmer 2s linear infinite',
				'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'bounce-subtle': 'bounce-subtle 1s ease-in-out infinite',
			},
			// 背景图片 - 性能优化
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
				'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
				'shimmer': 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
			},
			// 响应式字体大小
			fontSize: {
				'xs': ['0.75rem', { lineHeight: '1rem' }],
				'sm': ['0.875rem', { lineHeight: '1.25rem' }],
				'base': ['1rem', { lineHeight: '1.5rem' }],
				'lg': ['1.125rem', { lineHeight: '1.75rem' }],
				'xl': ['1.25rem', { lineHeight: '1.75rem' }],
				'2xl': ['1.5rem', { lineHeight: '2rem' }],
				'3xl': ['1.875rem', { lineHeight: '2.25rem' }],
				'4xl': ['2.25rem', { lineHeight: '2.5rem' }],
				'5xl': ['3rem', { lineHeight: '1' }],
				'6xl': ['3.75rem', { lineHeight: '1' }],
			},
			// Z-index 层级管理
			zIndex: {
				'1': '1',
				'10': '10',
				'20': '20',
				'30': '30',
				'40': '40',
				'50': '50',
				'60': '60',
				'70': '70',
				'80': '80',
				'90': '90',
				'100': '100',
			},
			// 性能优化的backdrop-blur
			backdropBlur: {
				'none': '0',
				'sm': '4px',
				DEFAULT: '8px',
				'md': '12px',
				'lg': '16px',
				'xl': '24px',
				'2xl': '40px',
				'3xl': '64px',
			},
			// 性能优化的backdrop-brightness
			backdropBrightness: {
				'0': '0',
				'50': '.5',
				'75': '.75',
				'90': '.9',
				'95': '.95',
				'100': '1',
				'105': '1.05',
				'110': '1.1',
				'125': '1.25',
				'150': '1.5',
				'200': '2',
			},
		},
	},
	// 插件配置 - 性能优化
	plugins: [
		require('tailwindcss-animate'),
		// 添加自定义插件
		function({ addUtilities, addComponents, theme }) {
			// 自定义工具类
			addUtilities({
				'.text-gradient': {
					'background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
					'-webkit-background-clip': 'text',
					'-webkit-text-fill-color': 'transparent',
					'background-clip': 'text',
				},
				'.bg-glass': {
					'background': 'rgba(255, 255, 255, 0.25)',
					'backdrop-filter': 'blur(10px)',
					'-webkit-backdrop-filter': 'blur(10px)',
					'border': '1px solid rgba(255, 255, 255, 0.18)',
				},
				'.scrollbar-hide': {
					'-ms-overflow-style': 'none',
					'scrollbar-width': 'none',
					'&::-webkit-scrollbar': {
						display: 'none'
					}
				},
				'.scrollbar-thin': {
					'scrollbar-width': 'thin',
					'&::-webkit-scrollbar': {
						'width': '6px',
						'height': '6px'
					},
					'&::-webkit-scrollbar-track': {
						'background': theme('colors.neutral.100')
					},
					'&::-webkit-scrollbar-thumb': {
						'background': theme('colors.neutral.300'),
						'border-radius': '3px'
					},
					'&::-webkit-scrollbar-thumb:hover': {
						'background': theme('colors.neutral.400')
					}
				}
			})

			// 自定义组件
			addComponents({
				'.btn-primary': {
					'@apply bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2': {},
				},
				'.btn-secondary': {
					'@apply bg-secondary-500 hover:bg-secondary-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2': {},
				},
				'.card': {
					'@apply bg-white rounded-lg shadow-card border border-neutral-200 p-6': {},
				},
				'.input-field': {
					'@apply w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200': {},
				},
			})
		}
	],
	// 性能优化配置
	corePlugins: {
		// 禁用不常用的功能
		'preflight': true, // 重置样式
		'container': true, // 容器
		'accessibility': true, // 可访问性
		'pointerEvents': true, // 指针事件
	},
	// 实验性功能
	future: {
		hoverOnlyWhenSupported: true, // 只在支持的设备上启用hover效果
	},
}
