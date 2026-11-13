<script setup lang="ts">
/**
 * 项目内顶栏：返回项目列表 + 项目名 + 环境切换 + 设置 + 外观
 */
import { activeProject } from '../store/workspace'
import EnvSelect from './EnvSelect.vue'
import AppearanceMenu from './AppearanceMenu.vue'

const emit = defineEmits<{ back: []; settings: [] }>()
</script>

<template>
  <header class="topbar">
    <button class="back" @click="emit('back')">
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path
          d="M8.6 3L4.4 7l4.2 4"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span>项目</span>
    </button>

    <span class="divider" />
    <span class="name">{{ activeProject?.name }}</span>

    <span class="spacer" />

    <EnvSelect @manage="emit('settings')" />

    <button class="icon-btn" title="环境参数与变量" @click="emit('settings')">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M2 4.5h12M2 8h12M2 11.5h12"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
        />
        <circle cx="5.5" cy="4.5" r="1.9" fill="var(--surface-solid)" stroke="currentColor" stroke-width="1.4" />
        <circle cx="10.5" cy="8" r="1.9" fill="var(--surface-solid)" stroke="currentColor" stroke-width="1.4" />
        <circle cx="6.5" cy="11.5" r="1.9" fill="var(--surface-solid)" stroke="currentColor" stroke-width="1.4" />
      </svg>
    </button>

    <AppearanceMenu />
  </header>
</template>

<style scoped>
.topbar {
  /* 必须显式定位并抬高层级：
     顶栏有 backdrop-filter 会自己形成一个层叠上下文，而下面的工作区也是同样处理的，
     不指定 z-index 的话，环境/外观的下拉菜单会被下面那块面板整个盖住。 */
  position: relative;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 60px;
  flex: 0 0 auto;
  padding: 0 16px;
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
  background: var(--surface);
  backdrop-filter: var(--blur);
  box-shadow: var(--shadow-2);
}

.back {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 12px 0 8px;
  border-radius: var(--radius-sm);
  color: var(--text-2);
  font-size: var(--font-md);
  transition: color 0.15s, background 0.15s;
}

.back:hover {
  background: var(--hover);
  color: var(--text);
}

.divider {
  width: 1px;
  height: 18px;
  background: var(--border);
}

.name {
  font-size: var(--font-md);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.spacer {
  flex: 1;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--h-ctl);
  height: var(--h-ctl);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-soft);
  color: var(--text-2);
  transition: color 0.15s, border-color 0.15s, background 0.15s, transform 0.15s;
}

.icon-btn:hover {
  border-color: var(--border-strong);
  background: var(--hover);
  color: var(--text);
  transform: translateY(-1px);
}
</style>
