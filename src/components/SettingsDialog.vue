<script setup lang="ts">
/**
 * 项目设置：环境参数 / 环境变量，以及全局参数 / 全局变量
 *
 * 左边选「某个环境」或「全局」，右边对应两组表格：
 *   参数 = 请求头，会随请求自动带上
 *   变量 = 被 {{名字}} 引用，发送前替换成真实值
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { VariableHint } from '../store/workspace'
import {
  activeProject,
  addEnvironment,
  removeEnvironment,
  setActiveEnvironment,
} from '../store/workspace'
import { askConfirm } from '../store/confirm'
import KeyValueEditor from './KeyValueEditor.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

/** 模板里直接写 {{名字}} 会被当成插值，所以放常量 */
const VAR_EXAMPLE = '{{名字}}'

const HEADER_SUGGESTIONS = [
  'Accept',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Content-Type',
  'Origin',
  'Referer',
  'User-Agent',
  'X-API-Key',
  'X-Request-Id',
  'X-Trace-Id',
]

/** 当前选中：'global' 表示全局，否则是环境 id */
const selected = ref<string>('global')

const project = computed(() => activeProject.value)
const selectedEnv = computed(() =>
  project.value?.environments.find((env) => env.id === selected.value),
)

const isActiveEnv = computed(() => selectedEnv.value?.id === project.value?.activeEnvId)

/** 当前这几张表格能用到的变量（全局 + 正在编辑的环境） */
const hintVars = computed<VariableHint[]>(() => {
  const current = project.value
  if (!current) return []

  const list: VariableHint[] = []
  for (const row of current.vars) {
    if (row.enabled && row.key.trim()) {
      list.push({ key: row.key.trim(), value: row.value, source: '全局' })
    }
  }
  for (const row of selectedEnv.value?.vars ?? []) {
    if (row.enabled && row.key.trim()) {
      list.push({ key: row.key.trim(), value: row.value, source: '环境' })
    }
  }
  return list
})

// 每次打开都定位到当前环境
watch(
  () => props.open,
  (open) => {
    if (open) selected.value = project.value?.activeEnvId ?? 'global'
  },
)

function createEnvironment() {
  const env = addEnvironment('新环境')
  if (env) selected.value = env.id
}

async function deleteEnvironment() {
  const env = selectedEnv.value
  if (!env) return
  const ok = await askConfirm({
    title: `删除环境「${env.name}」？`,
    message: '这个环境的参数和变量会一起删除。',
  })
  if (!ok) return
  removeEnvironment(env.id)
  selected.value = project.value?.activeEnvId ?? 'global'
}

function onKeydown(event: KeyboardEvent) {
  if (props.open && event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="fade">
    <div v-if="open && project" class="overlay" @mousedown.self="emit('close')">
      <div class="dialog">
        <header class="header">
          <div>
            <h2>项目设置</h2>
            <p class="sub">{{ project.name }}</p>
          </div>
          <button class="close" title="关闭" @click="emit('close')">×</button>
        </header>

        <div class="body">
          <nav class="nav">
            <p class="nav-title">环境</p>
            <button
              v-for="env in project.environments"
              :key="env.id"
              class="nav-item"
              :class="{ on: selected === env.id }"
              @click="selected = env.id"
            >
              <span class="env-name">{{ env.name }}</span>
              <span v-if="env.id === project.activeEnvId" class="tag">当前</span>
            </button>
            <button class="nav-item add" @click="createEnvironment">+ 新增环境</button>

            <p class="nav-title second">全局</p>
            <button
              class="nav-item"
              :class="{ on: selected === 'global' }"
              @click="selected = 'global'"
            >
              <span class="env-name">参数与变量</span>
            </button>
          </nav>

          <section class="content">
            <!-- 某个环境 -->
            <template v-if="selectedEnv">
              <div class="head">
                <div class="fields">
                  <div class="field">
                    <label>环境名称</label>
                    <input
                      v-model="selectedEnv.name"
                      class="text-input"
                      @blur="selectedEnv.name = selectedEnv.name.trim() || '未命名环境'"
                    />
                  </div>
                  <div class="field">
                    <label>请求前缀</label>
                    <input
                      v-model="selectedEnv.baseUrl"
                      class="text-input mono"
                      placeholder="https://api.example.com"
                      spellcheck="false"
                    />
                  </div>
                </div>

                <div class="head-actions">
                  <button
                    class="ghost"
                    :disabled="isActiveEnv"
                    @click="setActiveEnvironment(selectedEnv.id)"
                  >
                    {{ isActiveEnv ? '当前环境' : '设为当前' }}
                  </button>
                  <button
                    class="danger"
                    :disabled="project.environments.length <= 1"
                    @click="deleteEnvironment"
                  >
                    删除环境
                  </button>
                </div>
              </div>

              <p class="prefix-hint">
                接口地址只写路径（例如 <code>/users/1</code>）时会自动拼在请求前缀后面；写完整地址（以
                <code>http://</code> 或 <code>https://</code> 开头）则直接使用，不走前缀。
              </p>

              <div class="block">
                <p class="block-title">
                  环境参数<span>请求头，切到这个环境时自动带上</span>
                </p>
                <KeyValueEditor
                  :rows="selectedEnv.headers"
                  :suggestions="HEADER_SUGGESTIONS"
                  :variables="hintVars"
                  key-placeholder="键名"
                  value-placeholder="值，支持 {{变量}}"
                />
              </div>

              <div class="block">
                <p class="block-title">
                  环境变量<span>在地址、请求头、请求体里用 {{ VAR_EXAMPLE }} 引用</span>
                </p>
                <KeyValueEditor
                  :rows="selectedEnv.vars"
                  key-placeholder="变量名"
                  value-placeholder="变量值"
                />
              </div>
            </template>

            <!-- 全局 -->
            <template v-else>
              <div class="head">
                <div class="field">
                  <label>全局</label>
                  <span class="ro">整个项目生效，优先级低于环境</span>
                </div>
              </div>

              <div class="block">
                <p class="block-title">
                  全局参数<span>请求头，所有请求都会带上</span>
                </p>
                <KeyValueEditor
                  :rows="project.headers"
                  :suggestions="HEADER_SUGGESTIONS"
                  :variables="hintVars"
                  key-placeholder="键名"
                  value-placeholder="值，支持 {{变量}}"
                />
              </div>

              <div class="block">
                <p class="block-title">
                  全局变量<span>所有环境都能用，同名的环境变量优先</span>
                </p>
                <KeyValueEditor
                  :rows="project.vars"
                  key-placeholder="变量名"
                  value-placeholder="变量值"
                />
              </div>
            </template>
          </section>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(12, 13, 20, 0.34);
  backdrop-filter: blur(8px);
}

.dialog {
  width: 820px;
  max-width: calc(100vw - 64px);
  height: auto;
  min-height: 500px;
  max-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-xl);
  background: var(--surface-solid);
  box-shadow: var(--shadow-3);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--border);
}

h2 {
  margin: 0;
  font-size: var(--font-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.sub {
  margin: 3px 0 0;
  color: var(--text-3);
  font-size: var(--font-xs);
}

.close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  color: var(--text-3);
  font-size: 20px;
  line-height: 1;
  transition: background 0.15s, color 0.15s;
}

.close:hover {
  background: var(--hover);
  color: var(--text);
}

.body {
  flex: 1;
  min-height: 0;
  display: flex;
}

.nav {
  flex: 0 0 216px;
  padding: 14px 12px;
  border-right: 1px solid var(--border);
  background: var(--neutral-soft);
  overflow: auto;
}

.nav-title {
  margin: 6px 10px 8px;
  color: var(--text-3);
  font-size: var(--font-xs);
  letter-spacing: 0.04em;
}

.nav-title.second {
  margin-top: 20px;
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border-radius: var(--radius-sm);
  color: var(--text-2);
  font-size: var(--font-md);
  text-align: left;
  transition: background 0.14s, color 0.14s, box-shadow 0.14s;
}

.nav-item:hover {
  background: var(--hover);
}

.nav-item.on {
  background: var(--surface-solid);
  box-shadow: var(--shadow-1);
  color: var(--text);
  font-weight: 500;
}

.nav-item.add {
  margin-top: 2px;
  color: var(--text-3);
}

.nav-item.add:hover {
  color: var(--accent);
}

.env-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag {
  flex: 0 0 auto;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--green-soft);
  color: var(--green);
  font-size: 10.5px;
  font-weight: 400;
}

.content {
  flex: 1;
  min-width: 0;
  padding: 20px 24px 28px;
  overflow: auto;
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 14px 16px;
  margin-bottom: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

/* 两个输入框平分一行；窄了自动换行，不会把右边按钮挤成两行字 */
.fields {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 14px 16px;
  min-width: 0;
}

.fields .field {
  flex: 1 1 170px;
}

.fields .text-input {
  width: 100%;
}

.mono {
  font-family: var(--mono);
  font-size: var(--font-sm);
}

.prefix-hint {
  margin: -8px 0 18px;
  color: var(--text-3);
  font-size: var(--font-xs);
  line-height: 1.8;
}

.prefix-hint code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--neutral-soft);
  font-family: var(--mono);
}

label {
  color: var(--text-3);
  font-size: var(--font-xs);
}

.text-input {
  width: 260px;
  height: var(--h-ctl);
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--field);
  font-size: var(--font-md);
  font-weight: 500;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}

.text-input:focus {
  border-color: var(--accent);
  background: var(--surface-solid);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.ro {
  color: var(--text-3);
  font-size: var(--font-sm);
}

/* 按钮单独占一行、靠右：和两个输入框挤在一行会被压成两行字 */
.head-actions {
  display: flex;
  flex: 1 0 100%;
  justify-content: flex-end;
  gap: 8px;
}

.head-actions button {
  white-space: nowrap;
}

.ghost,
.danger {
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  color: var(--text-2);
  font-size: var(--font-sm);
  transition: color 0.15s, border-color 0.15s, background 0.15s, opacity 0.15s;
}

.ghost:hover:not(:disabled) {
  border-color: var(--border-strong);
  color: var(--text);
}

.danger:hover:not(:disabled) {
  border-color: transparent;
  background: var(--red-soft);
  color: var(--red);
}

.ghost:disabled,
.danger:disabled {
  opacity: 0.45;
  cursor: default;
}

.block {
  margin-bottom: 16px;
  padding: 16px 18px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--field);
}

.block-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 8px;
  font-size: var(--font-md);
  font-weight: 600;
}

.block-title span {
  color: var(--text-3);
  font-size: var(--font-xs);
  font-weight: 400;
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
