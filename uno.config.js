import presetAttributify from '@unocss/preset-attributify'
import transformerDirectives from '@unocss/transformer-directives'
import {
  defineConfig,
  presetIcons,
  presetTypography,
  presetWind3,
  transformerVariantGroup,
} from 'unocss'
import presetTheme from 'unocss-preset-theme'
import { themeConfig } from './src/.config'

const { colorsDark, colorsLight, fonts } = themeConfig.appearance

const cssExtend = {
  ':root': {
    '--prose-borders': '#eee',
  },
  // 增加文章内容区域宽度
	   '.prose': {
	       'max-width': 'none',
	         },

  'code::before,code::after': {
    content: 'none',
  },

  ':where(:not(pre):not(a) > code)': {
    'white-space': 'normal',
    'word-wrap': 'break-word',
    'padding': '2px 4px',
    'color': '#c7254e',
    'font-size': '90%',
    'background-color': '#f9f2f4',
    'border-radius': '4px',
  },

  'li': {
    'white-space': 'normal',
    'word-wrap': 'break-word',
  },
  // 添加轻量级表格样式
  'table': {
    'border-collapse': 'collapse',
    'margin': '1rem 0',
    'width': '100%',
  },

  'th, td': {
    'border': '2px solid #d1d5db',
    'padding': '0.5rem 0.75rem',
    'text-align': 'left',
  },

  'th': {
    'background-color': '#f9fafb',
    'font-weight': '500',
    'border-bottom': '2px solid #9ca3af',
    'color': '#374151',
  },

  // 深色主题下的表格样式
  ':root.dark th, :root.dark td': {
    'border': '2px solid #4b5563',
  },

  ':root.dark th': {
    'background-color': '#374151',
    'color': '#f3f4f6',
    'border-bottom': '2px solid #6b7280',
  },
}

export default defineConfig({
  rules: [
    [
      /^row-(\d+)-(\d)$/,
      ([, start, end]) => ({ 'grid-row': `${start}/${end}` }),
    ],
    [
      /^col-(\d+)-(\d)$/,
      ([, start, end]) => ({ 'grid-column': `${start}/${end}` }),
    ],
    [
      /^scrollbar-hide$/,
      ([_]) => `.scrollbar-hide { scrollbar-width:none;-ms-overflow-style: none; }
      .scrollbar-hide::-webkit-scrollbar {display:none;}`,
    ],
  ],
  presets: [
    presetWind3(),
    presetTypography({ cssExtend }),
    presetAttributify(),
    presetIcons({ scale: 1.2, warn: true }),
    presetTheme ({
      theme: {
        dark: {
          colors: { ...colorsDark, shadow: '#FFFFFF0A' },
          // TODO 需要配置代码块颜色
        },
      },
    }),
  ],
  theme: {
    colors: { ...colorsLight, shadow: '#0000000A' },
    fontFamily: fonts,
  },
  shortcuts: [
    ['post-title', 'text-5 font-bold lh-7.5 m-0'],
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  safelist: [
    ...themeConfig.site.socialLinks.map(social => `i-mdi-${social.name}`),
    'i-mdi-content-copy',
    'i-mdi-check',
  ],
})
