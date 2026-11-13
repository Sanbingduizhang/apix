<script setup lang="ts">
/**
 * 确认对话框的渲染层（全局只挂一个，放在 App.vue 里）
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { answerConfirm, confirmState } from '../store/confirm'

function onKeydown(event: KeyboardEvent) {
  if (!confirmState.open) return
  if (event.key === 'Escape') answerConfirm(false)
  if (event.key === 'Enter') answerConfirm(true)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="fade">
    <div v-if="confirmState.open" class="overlay" @mousedown.self="answerConfirm(false)">
      <div class="dialog">
        <h3>{{ confirmState.title }}</h3>
        <p v-if="confirmState.message">{{ confirmState.message }}</p>

        <div class="actions">
          <button class="ghost" @click="answerConfirm(false)">取消</button>
          <button class="primary" :class="{ danger: confirmState.danger }" @click="answerConfirm(true)">
            {{ confirmState.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(12, 13, 20, 0.36);
  backdrop-filter: blur(6px);
}

.dialog {
  width: 384px;
  max-width: calc(100vw - 48px);
  padding: 24px;
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-xl);
  background: var(--surface-solid);
  box-shadow: var(--shadow-3);
}

h3 {
  margin: 0;
  font-size: var(--font-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

p {
  margin: 10px 0 0;
  color: var(--text-2);
  font-size: var(--font-md);
  line-height: 1.6;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.ghost {
  height: var(--h-ctl);
  padding: 0 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-soft);
  color: var(--text-2);
  font-size: var(--font-md);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.ghost:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.primary {
  height: var(--h-ctl);
  padding: 0 20px;
  border-radius: var(--radius);
  background: var(--grad);
  box-shadow: var(--shadow-btn), var(--inset-top);
  color: var(--accent-contrast);
  font-size: var(--font-md);
  font-weight: 500;
}

.primary.danger {
  background: linear-gradient(135deg, #f0564f, #d93b47);
  box-shadow: 0 8px 20px -8px rgba(224, 74, 68, 0.6), var(--inset-top);
  color: #fff;
}

.primary:hover {
  filter: brightness(1.05);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.16s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
