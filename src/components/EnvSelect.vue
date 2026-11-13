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
const current = computed(() =>
  environments.value.find((env) => env.id === activeProject.value?.activeEnvId),
)

function choose(envId: string) {
  setActiveEnvironment(envId)
  open.value = false
}

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
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
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
          v-for="env in environments"
          :key="env.id"
          class="option"
          :class="{ active: env.id === activeProject?.activeEnvId }"
          @click="choose(env.id)"
        >
          <span class="opt-main">
            <span class="opt-name">{{ env.name }}</span>
            <span class="opt-prefix">{{ env.baseUrl || '未设置请求前缀' }}</span>
          </span>
          <span class="count">{{ env.vars.filter((v) => v.enabled && v.key).length }} 变量</span>
        </button>

        <div class="sep" />
        <button class="option manage" @click="manage">管理环境与参数…</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.env {
  position: relative;
}

.trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  height: var(--h-ctl);
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-soft);
  color: var(--text-2);
  font-size: var(--font-sm);
  transition: border-color 0.15s, color 0.15s, background 0.15s, transform 0.15s;
}

.trigger:hover,
.trigger.open {
  border-color: var(--border-strong);
  background: var(--surface-solid);
  color: var(--text);
  transform: translateY(-1px);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 0 3px var(--green-soft);
}

.name {
  max-width: 130px;
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 40;
  width: 232px;
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
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  text-align: left;
  transition: background 0.13s, color 0.13s;
}

.option:hover {
  background: var(--hover);
}

.option.active {
  color: var(--accent);
  font-weight: 500;
}

.opt-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

/* 前缀用等宽字，一眼能看出切过去打的是哪台机器 */
.opt-prefix {
  overflow: hidden;
  color: var(--text-3);
  font-family: var(--mono);
  font-size: 10.5px;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.opt-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.count {
  flex: 0 0 auto;
  color: var(--text-3);
  font-size: var(--font-xs);
  font-weight: 400;
}

.sep {
  height: 1px;
  margin: 6px 8px;
  background: var(--border);
}

.manage {
  color: var(--text-2);
}

.manage:hover {
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
