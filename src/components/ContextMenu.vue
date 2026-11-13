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
  const width = 168
  const height = menu.items.length * 32 + 12
  const x = Math.min(menu.x, window.innerWidth - width - 8)
  const y = Math.min(menu.y, window.innerHeight - height - 8)
  return { left: `${Math.max(8, x)}px`, top: `${Math.max(8, y)}px` }
})

function run(action?: () => void) {
  closeMenu()
  action?.()
}
</script>

<template>
  <div v-if="menu.open" class="overlay" @mousedown="closeMenu" @contextmenu.prevent="closeMenu" />
  <div v-if="menu.open" class="menu" :style="style">
    <template v-for="(item, index) in menu.items" :key="index">
      <div v-if="item.separator" class="sep" />
      <button v-else class="item" :class="{ danger: item.danger }" @click="run(item.action)">
        {{ item.label }}
      </button>
    </template>
  </div>
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
  width: 168px;
  padding: 5px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-pop);
}

.item {
  display: block;
  width: 100%;
  height: 30px;
  padding: 0 9px;
  border-radius: 6px;
  color: var(--text);
  font-size: 12.5px;
  text-align: left;
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
  margin: 5px 6px;
  background: var(--border);
}
</style>
