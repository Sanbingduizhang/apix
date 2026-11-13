<script setup lang="ts">
/**
 * 外观菜单：主题（浅色/深色/跟随系统）+ 界面字号
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  setTheme,
  setUiSize,
  sizeLabels,
  themeLabels,
  themeMode,
  uiSize,
  type ThemeMode,
  type UiSize,
} from '../store/theme'

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const isDarkNow = computed(() => document.documentElement.dataset.theme === 'dark')

function chooseTheme(mode: ThemeMode) {
  setTheme(mode)
}

function chooseSize(size: UiSize) {
  setUiSize(size)
}

function onDocumentMousedown(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onDocumentMousedown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentMousedown))
</script>

<template>
  <div ref="root" class="appearance">
    <button class="trigger" :class="{ open }" title="外观" @click="open = !open">
      <svg v-if="isDarkNow" width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M13.2 9.6A5.6 5.6 0 016.4 2.8a5.6 5.6 0 106.8 6.8z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linejoin="round"
        />
      </svg>
      <svg v-else width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="3.4" fill="none" stroke="currentColor" stroke-width="1.4" />
        <path
          d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M12.8 3.2l-1.1 1.1M4.3 11.7l-1.1 1.1"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
        />
      </svg>
    </button>

    <Transition name="pop">
      <div v-if="open" class="panel">
        <p class="label">主题</p>
        <button
          v-for="item in themeLabels"
          :key="item.value"
          class="option"
          :class="{ on: item.value === themeMode }"
          @click="chooseTheme(item.value)"
        >
          <span>{{ item.label }}</span>
          <svg v-if="item.value === themeMode" class="tick" width="12" height="12" viewBox="0 0 12 12">
            <path
              d="M2.5 6.2l2.4 2.4 4.6-5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <div class="sep" />

        <p class="label">界面字号</p>
        <button
          v-for="item in sizeLabels"
          :key="item.value"
          class="option"
          :class="{ on: item.value === uiSize }"
          @click="chooseSize(item.value)"
        >
          <span>{{ item.label }}</span>
          <svg v-if="item.value === uiSize" class="tick" width="12" height="12" viewBox="0 0 12 12">
            <path
              d="M2.5 6.2l2.4 2.4 4.6-5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.appearance {
  position: relative;
}

.trigger {
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

.trigger:hover,
.trigger.open {
  border-color: var(--border-strong);
  background: var(--surface-solid);
  color: var(--text);
  transform: translateY(-1px);
}

.panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 40;
  width: 176px;
  padding: 10px;
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
  background: var(--surface-solid);
  box-shadow: var(--shadow-3);
}

.label {
  margin: 4px 8px 6px;
  color: var(--text-3);
  font-size: var(--font-xs);
  letter-spacing: 0.04em;
}

.option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 32px;
  padding: 0 9px;
  border-radius: var(--radius-sm);
  font-size: var(--font-md);
  text-align: left;
  transition: background 0.12s, color 0.12s;
}

.option:hover {
  background: var(--hover);
}

.option.on {
  color: var(--accent);
  font-weight: 500;
}

.tick {
  color: var(--accent);
}

.sep {
  height: 1px;
  margin: 8px 6px;
  background: var(--border);
}

.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>
