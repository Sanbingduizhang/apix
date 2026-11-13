/**
 * 确认对话框
 *
 * 原生 confirm() 在桌面端和浏览器里的表现不一致（有的环境会被拦截），
 * 而且样式也没法统一，所以换成自己画的：askConfirm() 返回 Promise<boolean>。
 */
import { reactive } from 'vue'

interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  danger?: boolean
}

export const confirmState = reactive({
  open: false,
  title: '',
  message: '',
  confirmText: '确定',
  danger: true,
})

let resolveCurrent: ((ok: boolean) => void) | null = null

/** 弹确认框；用户点"确认"得到 true，"取消"或关闭得到 false */
export function askConfirm(options: ConfirmOptions): Promise<boolean> {
  confirmState.open = true
  confirmState.title = options.title
  confirmState.message = options.message ?? ''
  confirmState.confirmText = options.confirmText ?? '删除'
  confirmState.danger = options.danger ?? true

  return new Promise((resolve) => {
    resolveCurrent = resolve
  })
}

export function answerConfirm(ok: boolean) {
  confirmState.open = false
  resolveCurrent?.(ok)
  resolveCurrent = null
}
