/**
 * 外观：主题（浅色 / 深色 / 跟随系统）+ 界面字号
 *
 * 只负责往 html 上写两个属性：
 *   data-theme = light | dark
 *   data-size  = small | medium | large
 * 具体长什么样全在 styles.css 的变量里，组件不需要感知。
 */
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'
export type UiSize = 'small' | 'medium' | 'large'

const THEME_KEY = 'apix.theme'
const SIZE_KEY = 'apix.uiSize'

export const themeLabels: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
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

const media = window.matchMedia('(prefers-color-scheme: dark)')

function applyTheme() {
  const dark = themeMode.value === 'dark' || (themeMode.value === 'system' && media.matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

function applySize() {
  document.documentElement.dataset.size = uiSize.value
}

export function setTheme(mode: ThemeMode) {
  themeMode.value = mode
}

export function setUiSize(size: UiSize) {
  uiSize.value = size
}

watch(themeMode, (mode) => {
  localStorage.setItem(THEME_KEY, mode)
  applyTheme()
})

watch(uiSize, (size) => {
  localStorage.setItem(SIZE_KEY, size)
  applySize()
})

// 选择"跟随系统"时，系统切换主题要实时响应
media.addEventListener('change', () => {
  if (themeMode.value === 'system') applyTheme()
})

applyTheme()
applySize()
