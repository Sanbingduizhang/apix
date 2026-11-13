<script setup lang="ts">
/**
 * 通用右键菜单
 *
 * 位置由 store/contextMenu.ts 提供，菜单项由调用方给出。
 * 这里只负责画出来、别超出屏幕、点完关闭。
 */
import { computed } from 'vue'
import { closeMenu, menu } from '../store/contextMenu'

/** 简单夹一下坐标，避免菜单跑到窗口外面 */
const style = computed(() => {
  const width = 188
  const height = menu.items.length * 34 + 14
  const x = Math.min(menu.x, window.innerWidth - width - 10)
  const y = Math.min(menu.y, window.innerHeight - height - 10)
  return { left: `${Math.max(10, x)}px`, top: `${Math.max(10, y)}px` }
})

function run(action?: () => void) {
  closeMenu()
  action?.()
}
</script>

<template>
  <div v-if="menu.open" class="overlay" @mousedown="closeMenu" @contextmenu.prevent="closeMenu" />
  <Transition name="pop">
    <div v-if="menu.open" class="menu" :style="style">
      <template v-for="(item, index) in menu.items" :key="index">
        <div v-if="item.separator" class="sep" />
        <button v-else class="item" :class="{ danger: item.danger }" @click="run(item.action)">
          {{ item.label }}
        </button>
      </template>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
}

.menu {
  position: fixed;
  z-index: 61;
  width: 188px;
  padding: 7px;
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
  background: var(--surface-solid);
  box-shadow: var(--shadow-3);
}

.item {
  display: block;
  width: 100%;
  height: 34px;
  padding: 0 11px;
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: var(--font-sm);
  text-align: left;
  transition: background 0.12s, color 0.12s;
}

.item:hover {
  background: var(--hover);
}

.item.danger {
  color: var(--red);
}

.item.danger:hover {
  background: var(--red-soft);
}

.sep {
  height: 1px;
  margin: 6px 8px;
  background: var(--border);
}

.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.13s ease, transform 0.13s ease;
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>
