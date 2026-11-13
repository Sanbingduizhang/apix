<script setup lang="ts">
/**
 * 请求方法选择器
 *
 * 用原生 select 没法给每个选项上不同的颜色，所以自己画一个下拉。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const currentClass = computed(() => `m-${props.modelValue}`)

function choose(method: string) {
  emit('update:modelValue', method)
  open.value = false
}

function onDocumentMousedown(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onDocumentMousedown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentMousedown))
</script>

<template>
  <div ref="root" class="method-select">
    <button class="trigger" :class="{ open }" @click="open = !open">
      <span class="label" :class="currentClass">{{ modelValue }}</span>
      <svg class="chev" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path
          d="M2 4l3 3 3-3"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <Transition name="pop">
      <div v-if="open" class="list">
        <button
          v-for="method in METHODS"
          :key="method"
          class="option"
          :class="{ active: method === modelValue }"
          @click="choose(method)"
        >
          <span class="label" :class="`m-${method}`">{{ method }}</span>
          <svg v-if="method === modelValue" class="tick" width="12" height="12" viewBox="0 0 12 12">
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
.method-select {
  position: relative;
  flex: 0 0 auto;
}

.trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 108px;
  height: var(--h-ctl);
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-soft);
  color: var(--text-3);
  transition: border-color 0.15s, background 0.15s, transform 0.15s;
}

.trigger:hover,
.trigger.open {
  border-color: var(--border-strong);
  background: var(--surface-solid);
  transform: translateY(-1px);
}

.label {
  font-family: var(--mono);
  font-size: var(--font-sm);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.list {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  z-index: 40;
  width: 158px;
  padding: 6px;
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
  background: var(--surface-solid);
  box-shadow: var(--shadow-3);
}

.option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border-radius: var(--radius-sm);
  text-align: left;
  transition: background 0.13s;
}

.option:hover {
  background: var(--hover);
}

.option.active {
  background: var(--accent-soft);
}

.tick {
  color: var(--accent);
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
