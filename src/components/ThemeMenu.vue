<script setup lang="ts">
/**
 * 主题切换：浅色 / 深色 / 跟随系统
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { setTheme, themeLabels, themeMode, type ThemeMode } from '../store/theme'

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const currentLabel = computed(
  () => themeLabels.find((item) => item.value === themeMode.value)?.label ?? '跟随系统',
)

function choose(mode: ThemeMode) {
  setTheme(mode)
  open.value = false
}

function onDocumentMousedown(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onDocumentMousedown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentMousedown))
</script>

<template>
  <div ref="root" class="theme">
    <button class="trigger" :class="{ open }" :title="`主题：${currentLabel}`" @click="open = !open">
      <!-- 用两个简单图形表示明暗，不引图标库 -->
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" stroke-width="1.3" />
        <path d="M7 1v2M7 11v2M1 7h2M11 7h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
      </svg>
    </button>

    <div v-if="open" class="list">
      <button
        v-for="item in themeLabels"
        :key="item.value"
        class="option"
        :class="{ active: item.value === themeMode }"
        @click="choose(item.value)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.theme {
  position: relative;
}

.trigger {
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

.trigger:hover,
.trigger.open {
  border-color: var(--border-strong);
  color: var(--text);
}

.list {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  width: 132px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-pop);
}

.option {
  display: block;
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 12.5px;
  text-align: left;
}

.option:hover {
  background: var(--hover);
}

.option.active {
  color: var(--accent);
}
</style>
