<script setup lang="ts">
/**
 * 环境选择器：切换当前项目使用的环境（开发 / 测试 / 生产 / 自定义）
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { activeProject, setActiveEnvironment } from '../store/workspace'

const emit = defineEmits<{ manage: [] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const environments = computed(() => activeProject.value?.environments ?? [])
const current = computed(() => environments.value.find((e) => e.id === activeProject.value?.activeEnvId))

function choose(envId: string) {
  setActiveEnvironment(envId)
  open.value = false
}

/** 收起下拉并通知父组件打开设置 */
function manage() {
  open.value = false
  emit('manage')
}

function onDocumentMousedown(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onDocumentMousedown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentMousedown))
</script>

<template>
  <div ref="root" class="env">
    <button class="trigger" :class="{ open }" @click="open = !open">
      <span class="dot" />
      <span class="name">{{ current?.name ?? '未选择环境' }}</span>
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
        v-for="env in environments"
        :key="env.id"
        class="option"
        :class="{ active: env.id === activeProject?.activeEnvId }"
        @click="choose(env.id)"
      >
        <span>{{ env.name }}</span>
        <span class="count">{{ env.vars.filter((v) => v.enabled && v.key).length }} 个变量</span>
      </button>

      <div class="sep" />
      <button class="option" @click="manage">
        <span>管理环境与变量…</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.env {
  position: relative;
}

.trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 9px;
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text-2);
  font-size: 12.5px;
  transition: border-color 0.12s, color 0.12s;
}

.trigger:hover,
.trigger.open {
  border-color: var(--border-strong);
  color: var(--text);
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--green);
}

.name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  width: 208px;
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
  gap: 10px;
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

.count {
  color: var(--text-3);
  font-size: 11px;
}

.sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--border);
}
</style>
