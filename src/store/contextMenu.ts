/**
 * 右键菜单状态
 *
 * 目录树是递归组件，如果让每一层各自向上抛事件会很啰嗦。
 * 所以做成一个全局状态：任何组件只要调用 openMenu(事件, 菜单项) 就能弹出菜单，
 * 真正渲染菜单的只有 App.vue 里那一个 <ContextMenu />。
 */
import { reactive } from 'vue'

export interface MenuItem {
  separator?: boolean
  label?: string
  /** 危险操作显示成红色（比如删除） */
  danger?: boolean
  action?: () => void
}

export const menu = reactive({
  open: false,
  x: 0,
  y: 0,
  items: [] as MenuItem[],
})

export function openMenu(event: MouseEvent, items: MenuItem[]) {
  event.preventDefault()
  menu.items = items
  menu.x = event.clientX
  menu.y = event.clientY
  menu.open = true
}

export function closeMenu() {
  menu.open = false
}
