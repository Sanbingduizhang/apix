/**
 * 外观：明暗主题 + 配色方案 + 界面字号
 *
 * 只负责往 html 上写三个属性：
 *   data-theme   = light | dark
 *   data-palette = nature | warm
 *   data-size    = small | medium | large
 * 具体长什么样全在 styles.css 的变量里，组件不需要感知。
 */
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'
export type UiSize = 'small' | 'medium' | 'large'
export type Palette = 'nature' | 'warm' | 'tide' | 'candy' | 'neon' | 'clay' | 'mono'

const THEME_KEY = 'apix.theme'
const SIZE_KEY = 'apix.uiSize'
const PALETTE_KEY = 'apix.palette'

export const themeLabels: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
]

/** 配色方案：只换底色、柔光和主色，明暗和字号都独立 */
export const paletteLabels: { value: Palette; label: string; hint: string }[] = [
  { value: 'nature', label: '自然', hint: '雾绿底 · 青绿主色' },
  { value: 'warm', label: '暖阳', hint: '米色底 · 柔紫主色' },
  { value: 'tide', label: '潮汐', hint: '海雾蓝底 · 深海蓝主色' },
  { value: 'candy', label: '糖果', hint: '粉紫底 · 玫红到紫的渐变' },
  { value: 'neon', label: '霓虹', hint: '冷白底 · 电紫 + 荧光青' },
  { value: 'clay', label: '陶土', hint: '陶灰底 · 陶土橙，阴影更厚' },
  { value: 'mono', label: '墨白', hint: '中性灰白 · 石墨主色' },
]

export const sizeLabels: { value: UiSize; label: string }[] = [
  { value: 'small', label: '紧凑' },
  { value: 'medium', label: '标准' },
  { value: 'large', label: '宽松' },
]

export const themeMode = ref<ThemeMode>(
  (localStorage.getItem(THEME_KEY) as ThemeMode | null) ?? 'system',
)

export const uiSize = ref<UiSize>((localStorage.getItem(SIZE_KEY) as UiSize | null) ?? 'medium')

export const palette = ref<Palette>(
  (localStorage.getItem(PALETTE_KEY) as Palette | null) ?? 'nature',
)

const media = window.matchMedia('(prefers-color-scheme: dark)')

function applyTheme() {
  const dark = themeMode.value === 'dark' || (themeMode.value === 'system' && media.matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

function applySize() {
  document.documentElement.dataset.size = uiSize.value
}

function applyPalette() {
  document.documentElement.dataset.palette = palette.value
}

export function setTheme(mode: ThemeMode) {
  themeMode.value = mode
}

export function setUiSize(size: UiSize) {
  uiSize.value = size
}

export function setPalette(value: Palette) {
  palette.value = value
}

watch(themeMode, (mode) => {
  localStorage.setItem(THEME_KEY, mode)
  applyTheme()
})

watch(uiSize, (size) => {
  localStorage.setItem(SIZE_KEY, size)
  applySize()
})

watch(palette, (value) => {
  localStorage.setItem(PALETTE_KEY, value)
  applyPalette()
})

// 选择"跟随系统"时，系统切换主题要实时响应
media.addEventListener('change', () => {
  if (themeMode.value === 'system') applyTheme()
})

applyTheme()
applySize()
applyPalette()
