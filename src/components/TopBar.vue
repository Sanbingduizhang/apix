<script setup lang="ts">
/**
 * 项目内的顶栏：返回项目列表 + 项目名 + 环境切换 + 设置 + 主题
 */
import { activeProject } from '../store/workspace'
import EnvSelect from './EnvSelect.vue'
import ThemeMenu from './ThemeMenu.vue'

const emit = defineEmits<{ back: []; settings: [] }>()
</script>

<template>
  <header class="topbar">
    <button class="back" @click="emit('back')">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path
          d="M7.5 2.5L4 6l3.5 3.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      项目
    </button>

    <span class="divider" />
    <span class="name">{{ activeProject?.name }}</span>

    <span class="spacer" />

    <EnvSelect @manage="emit('settings')" />

    <button class="icon-btn" title="环境与变量设置" @click="emit('settings')">
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path
          d="M1 3.5h12M1 7h12M1 10.5h12"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
        />
        <circle cx="4.5" cy="3.5" r="1.7" fill="var(--surface)" stroke="currentColor" stroke-width="1.2" />
        <circle cx="9.5" cy="7" r="1.7" fill="var(--surface)" stroke="currentColor" stroke-width="1.2" />
        <circle cx="6" cy="10.5" r="1.7" fill="var(--surface)" stroke="currentColor" stroke-width="1.2" />
      </svg>
    </button>

    <ThemeMenu />
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  flex: 0 0 auto;
  padding: 0 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.back {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px 0 5px;
  border-radius: 6px;
  color: var(--text-2);
  font-size: 12.5px;
  transition: color 0.12s, background 0.12s;
}

.back:hover {
  color: var(--text);
  background: var(--hover);
}

.divider {
  width: 1px;
  height: 14px;
  background: var(--border);
}

.name {
  font-size: 13px;
  font-weight: 500;
}

.spacer {
  flex: 1;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text-2);
  transition: color 0.12s, border-color 0.12s;
}

.icon-btn:hover {
  border-color: var(--border-strong);
  color: var(--text);
}
</style>
