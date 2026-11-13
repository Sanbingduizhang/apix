/**
 * 主题：浅色 / 深色 / 跟随系统
 *
 * 只做一件事——把 html 的 data-theme 属性设成 light 或 dark，
 * 具体颜色由 styles.css 里的变量负责，组件完全不用感知主题。
 */
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'apix.theme'

export const themeLabels: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
]

export const themeMode = ref<ThemeMode>(
  (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? 'system',
)

/** 系统是否处于深色 */
const media = window.matchMedia('(prefers-color-scheme: dark)')

function apply() {
  const dark = themeMode.value === 'dark' || (themeMode.value === 'system' && media.matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function setTheme(mode: ThemeMode) {
  themeMode.value = mode
}

watch(themeMode, (mode) => {
  localStorage.setItem(STORAGE_KEY, mode)
  apply()
})

// 选择"跟随系统"时，系统切换主题要实时响应
media.addEventListener('change', () => {
  if (themeMode.value === 'system') apply()
})

apply()
