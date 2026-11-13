<script setup lang="ts">
/**
 * 请求方法选择器
 *
 * 用原生 select 没法给每个选项上不同的颜色，所以自己画一个下拉。
 * 键盘方面保留 Tab 聚焦，点外面自动收起。
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

/** 点击组件外部就收起 */
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
      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
        <path
          d="M2 4l3 3 3-3"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <div v-if="open" class="list">
      <button
        v-for="method in METHODS"
        :key="method"
        class="option"
        :class="{ active: method === modelValue }"
        @click="choose(method)"
      >
        <span class="label" :class="`m-${method}`">{{ method }}</span>
        <svg v-if="method === modelValue" class="tick" width="11" height="11" viewBox="0 0 12 12">
          <path
            d="M2.5 6.2l2.4 2.4 4.6-5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
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
  gap: 6px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--field-solid);
  color: var(--text-3);
  transition: border-color 0.12s, background 0.12s;
}

.trigger:hover,
.trigger.open {
  border-color: var(--border-strong);
  background: var(--surface);
}

.label {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.2px;
}

.list {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  z-index: 20;
  width: 132px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-pop);
}

.option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border-radius: 6px;
  text-align: left;
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
</style>
