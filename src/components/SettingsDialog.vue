<script setup lang="ts">
/**
 * 设置弹窗：管理当前项目的环境与变量
 *
 * 左边选「环境」或「全局变量」，右边编辑变量表。
 * 变量在请求的地址 / 请求头 / 请求体里用 {{变量名}} 引用。
 */
import { computed, ref, watch } from 'vue'
import {
  activeProject,
  addEnvironment,
  removeEnvironment,
} from '../store/workspace'
import KeyValueEditor from './KeyValueEditor.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

/** 当前编辑对象：'global' 表示全局变量，否则是环境 id */
const selected = ref<string>('global')

/** 模板里直接写 {{变量名}} 会被当成插值，所以放到变量里 */
const VAR_EXAMPLE = '{{变量名}}'

const project = computed(() => activeProject.value)

const selectedEnv = computed(() =>
  project.value?.environments.find((env) => env.id === selected.value),
)

// 每次打开都定位到当前环境，省得用户再点一次
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

function deleteEnvironment() {
  const env = selectedEnv.value
  if (!env) return
  if (!confirm(`删除环境「${env.name}」？里面的变量会一起删除。`)) return
  removeEnvironment(env.id)
  selected.value = project.value?.activeEnvId ?? 'global'
}
</script>

<template>
  <div v-if="open && project" class="overlay" @mousedown.self="emit('close')">
    <div class="dialog" @keydown.esc="emit('close')">
      <header class="header">
        <h2>设置</h2>
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
            <span class="env-count">{{ env.vars.filter((v) => v.enabled && v.key).length }}</span>
          </button>
          <button class="nav-item add" @click="createEnvironment">+ 新增环境</button>

          <p class="nav-title second">其他</p>
          <button
            class="nav-item"
            :class="{ on: selected === 'global' }"
            @click="selected = 'global'"
          >
            <span class="env-name">全局变量</span>
            <span class="env-count">{{ project.vars.filter((v) => v.enabled && v.key).length }}</span>
          </button>
        </nav>

        <section class="content">
          <!-- 环境变量 -->
          <template v-if="selectedEnv">
            <div class="content-head">
              <input
                v-model="selectedEnv.name"
                class="env-input"
                @blur="selectedEnv.name = selectedEnv.name.trim() || '未命名环境'"
              />
              <button
                class="danger-btn"
                :disabled="project.environments.length <= 1"
                @click="deleteEnvironment"
              >
                删除环境
              </button>
            </div>
            <KeyValueEditor
              :rows="selectedEnv.vars"
              key-placeholder="变量名"
              value-placeholder="变量值"
            />
          </template>

          <!-- 全局变量 -->
          <template v-else>
            <div class="content-head">
              <span class="content-title">全局变量</span>
              <span class="head-hint">所有环境都会生效</span>
            </div>
            <KeyValueEditor :rows="project.vars" key-placeholder="变量名" value-placeholder="变量值" />
          </template>

          <p class="tip">
            在地址、请求头、请求体里写 <code>{{ VAR_EXAMPLE }}</code> 即可引用；环境变量优先于全局变量。
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--overlay);
}

.dialog {
  width: 760px;
  max-width: calc(100vw - 64px);
  height: 540px;
  max-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow-pop);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
}

.header h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.close {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  color: var(--text-3);
  font-size: 17px;
  line-height: 1;
}

.close:hover {
  color: var(--text);
  background: var(--hover);
}

.body {
  flex: 1;
  min-height: 0;
  display: flex;
}

.nav {
  flex: 0 0 200px;
  padding: 12px 10px;
  border-right: 1px solid var(--border);
  background: var(--sidebar-bg);
}

.nav-title {
  margin: 6px 8px 6px;
  color: var(--text-3);
  font-size: 11px;
}

.nav-title.second {
  margin-top: 16px;
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border-radius: 6px;
  color: var(--text-2);
  font-size: 12.5px;
  text-align: left;
}

.nav-item:hover {
  background: var(--hover);
}

.nav-item.on {
  background: var(--surface);
  box-shadow: var(--shadow-card);
  color: var(--text);
  font-weight: 500;
}

.nav-item.add {
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

.env-count {
  color: var(--text-3);
  font-size: 11px;
  font-weight: 400;
}

.content {
  flex: 1;
  min-width: 0;
  padding: 16px 20px;
  overflow: auto;
}

.content-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.env-input {
  flex: 1;
  height: 30px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--field);
  font-size: 13px;
  font-weight: 500;
}

.env-input:focus {
  border-color: var(--accent);
  background: var(--surface);
}

.env-input[readonly] {
  color: var(--text-2);
}

.content-title {
  font-size: 13px;
  font-weight: 500;
}

.head-hint {
  color: var(--text-3);
  font-size: 11.5px;
}

.danger-btn {
  padding: 5px 10px;
  border-radius: 6px;
  color: var(--text-3);
  font-size: 12px;
}

.danger-btn:hover:not(:disabled) {
  color: var(--red);
  background: var(--red-soft);
}

.danger-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.tip {
  margin: 18px 0 0 26px;
  color: var(--text-3);
  font-size: 11.5px;
  line-height: 1.7;
}

.tip code {
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--field-solid);
  font-family: var(--mono);
  font-size: 11px;
}
</style>
