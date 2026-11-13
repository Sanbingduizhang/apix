<script setup lang="ts">
/**
 * 请求编辑区
 *
 * 两种状态：
 *   调试 —— 填参数、发请求、看响应（Params / Auth / Headers / Body / Path 五个页签）
 *   设计 —— 写接口名、说明和字段描述，相当于这份接口的文档
 *
 * 编辑的都是草稿（store/draft.ts），点「保存」才落库；切换接口时自动保存一次。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ApiRequest } from '../types'
import {
  activeBaseUrl,
  availableVariables,
  effectiveHeaders,
  isAbsoluteUrl,
  resolveUrl,
  syncPathParams,
} from '../store/workspace'
import { dirty, saveDraft } from '../store/draft'
import AuthEditor from './AuthEditor.vue'
import BodyEditor from './BodyEditor.vue'
import DesignPanel from './DesignPanel.vue'
import KeyValueEditor from './KeyValueEditor.vue'
import MethodSelect from './MethodSelect.vue'
import PathEditor from './PathEditor.vue'

const props = defineProps<{ request: ApiRequest; sending: boolean }>()
const emit = defineEmits<{ send: []; settings: []; resize: [percent: number] }>()

/** 顶层：调试 / 设计 */
const mode = ref<'debug' | 'design'>('debug')

// 切到设计态时把编辑区拉高一点，不然文档内容全被折叠在可视区外
watch(mode, (next) => emit('resize', next === 'design' ? 70 : 48))

// 地址里一出现 :id 就同步出对应的路径变量行（不管有没有打开 Path 页签）
watch(
  () => props.request.url,
  () => syncPathParams(props.request),
  { immediate: true },
)

type SubTab = 'params' | 'auth' | 'headers' | 'body' | 'path'
const tab = ref<SubTab>('params')

const SUB_TABS: { value: SubTab; label: string }[] = [
  { value: 'params', label: 'Params' },
  { value: 'auth', label: 'Auth' },
  { value: 'headers', label: 'Headers' },
  { value: 'body', label: 'Body' },
  { value: 'path', label: 'Path' },
]

/** 常用请求头，点"键名"输入框时作为候选 */
const HEADER_SUGGESTIONS = [
  'Accept',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Content-Type',
  'Cookie',
  'Origin',
  'Referer',
  'User-Agent',
  'X-API-Key',
  'X-Request-Id',
  'X-Trace-Id',
]

/** 这个请求最终会带上的头（含继承），用来算数量和展示 */
const mergedHeaders = computed(() => effectiveHeaders(props.request))
const inherited = computed(() => mergedHeaders.value.filter((item) => item.source !== '请求'))
const variables = computed(() => availableVariables())

const baseUrl = computed(() => activeBaseUrl.value)
const showPrefix = computed(() => !isAbsoluteUrl(props.request.url))
const fullUrl = computed(() => resolveUrl(props.request.url))
const urlPlaceholder = computed(() =>
  showPrefix.value ? '/users/1（只写路径，前缀自动拼上）' : 'https://api.example.com/users/1',
)

/** 页签右边的角标数字 */
function countOf(item: SubTab): number {
  const request = props.request
  if (item === 'params') return request.params.filter((row) => row.enabled && row.key.trim()).length
  if (item === 'headers') return mergedHeaders.value.length
  if (item === 'path') return request.pathParams.length
  if (item === 'body') return request.bodyType === 'none' ? 0 : 1
  return request.auth.type === 'none' ? 0 : 1
}

function save() {
  saveDraft()
}

/** ⌘S / Ctrl+S 保存，避免肌肉记忆去按浏览器保存 */
function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    save()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <section class="editor">
    <!-- 地址栏：方法 + 请求前缀 + 路径 -->
    <div class="bar">
      <MethodSelect :model-value="request.method" @update:model-value="request.method = $event" />

      <div class="url-box">
        <span
          v-if="showPrefix"
          class="prefix"
          :class="{ unset: !baseUrl }"
          role="button"
          tabindex="0"
          :title="
            baseUrl
              ? `请求前缀（来自当前环境）：${baseUrl}，点一下去修改`
              : '还没有设置请求前缀，点一下去设置'
          "
          @click="emit('settings')"
          @keydown.enter.prevent="emit('settings')"
        >
          <span class="prefix-text">{{ baseUrl || '设置前缀' }}</span>
        </span>

        <input
          v-model="request.url"
          class="url"
          :placeholder="urlPlaceholder"
          :title="fullUrl"
          spellcheck="false"
          autocomplete="off"
          @keydown.enter.exact="emit('send')"
        />
      </div>

      <button class="save" :class="{ dirty }" title="保存（⌘S）" @click="save">
        {{ dirty ? '保存' : '已保存' }}
      </button>

      <button class="send" :disabled="sending" @click="emit('send')">
        {{ sending ? '发送中' : '发送' }}
      </button>
    </div>

    <!-- 调试 / 设计 + 子页签 -->
    <div class="tabs">
      <div class="mode-switch">
        <button :class="{ on: mode === 'debug' }" @click="mode = 'debug'">调试</button>
        <button :class="{ on: mode === 'design' }" @click="mode = 'design'">设计</button>
      </div>

      <div v-if="mode === 'debug'" class="sub">
        <button
          v-for="item in SUB_TABS"
          :key="item.value"
          class="sub-tab"
          :class="{ on: tab === item.value }"
          @click="tab = item.value"
        >
          {{ item.label }}
          <span v-if="countOf(item.value)" class="count">{{ countOf(item.value) }}</span>
        </button>
      </div>

      <span class="spacer" />

      <span v-if="dirty" class="dirty">有未保存的修改</span>
    </div>

    <div class="pane">
      <!-- 设计态 -->
      <DesignPanel v-if="mode === 'design'" :request="request" />

      <!-- 调试态 -->
      <template v-else>
        <KeyValueEditor
          v-if="tab === 'params'"
          :rows="request.params"
          :variables="variables"
          with-desc
          key-placeholder="参数名"
          value-placeholder="参数值"
        />

        <AuthEditor v-else-if="tab === 'auth'" :auth="request.auth" />

        <template v-else-if="tab === 'headers'">
          <KeyValueEditor
            :rows="request.headers"
            :suggestions="HEADER_SUGGESTIONS"
            :variables="variables"
            with-desc
            key-placeholder="键名"
            value-placeholder="值，支持 {{变量}}"
          />

          <!-- 继承来的请求头：只读，让你清楚这次请求到底带了什么 -->
          <section class="inherited">
            <p class="sec-title">
              继承的请求头
              <span>来自全局参数 / 环境参数，发送时自动带上</span>
            </p>

            <div v-if="inherited.length" class="inh-list">
              <div v-for="item in inherited" :key="item.key" class="inh-row">
                <span class="inh-key">{{ item.key }}</span>
                <span class="inh-value">{{ item.value || '（空）' }}</span>
                <span class="inh-source" :class="item.source === '环境' ? 'env' : 'global'">
                  {{ item.source }}
                </span>
              </div>
            </div>
            <p v-else class="inh-empty">还没有配置全局或环境参数</p>
          </section>
        </template>

        <BodyEditor v-else-if="tab === 'body'" :request="request" :variables="variables" />

        <PathEditor v-else :request="request" />
      </template>
    </div>
  </section>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px 10px;
  flex: 0 0 auto;
}

/* 地址栏：三段拼成一个整体，像一条命令输入框 */
.url-box {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: stretch;
  height: var(--h-ctl);
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--field);
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}

.url-box:focus-within {
  border-color: var(--accent);
  background: var(--surface-solid);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

/* 前缀：只读展示，点一下去设置里改 */
.prefix {
  flex: 0 1 auto;
  max-width: min(320px, 42%);
  display: flex;
  align-items: center;
  margin: 0;
  height: calc(var(--h-ctl) - 2px);
  padding: 0 13px;
  border-right: 1px solid var(--border);
  background: var(--neutral-soft);
  color: var(--text-3);
  font-family: var(--mono);
  font-size: var(--font-sm);
  cursor: pointer;
  transition: color 0.14s, background 0.14s;
}

.prefix:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

/* 前缀太长就省略，鼠标停上去看完整地址 */
.prefix-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prefix.unset {
  color: var(--accent);
  font-family: var(--sans);
}

.url {
  flex: 1;
  min-width: 0;
  padding: 0 14px;
  border: none;
  background: transparent;
  font-family: var(--mono);
  font-size: var(--font-sm);
}

.save {
  flex: 0 0 auto;
  height: var(--h-ctl);
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-soft);
  color: var(--text-3);
  font-size: var(--font-sm);
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.save.dirty {
  border-color: transparent;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 500;
}

.save:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.save.dirty:hover {
  border-color: transparent;
  color: var(--accent);
}

.send {
  flex: 0 0 auto;
  height: var(--h-ctl);
  padding: 0 24px;
  border-radius: var(--radius);
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  box-shadow: var(--shadow-btn), var(--inset-top);
  color: var(--accent-contrast);
  font-size: var(--font-md);
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: transform 0.15s, filter 0.15s, opacity 0.15s;
}

.send:hover:not(:disabled) {
  filter: brightness(1.06);
  transform: translateY(-1px);
}

.send:active:not(:disabled) {
  transform: translateY(0);
}

.send:disabled {
  opacity: 0.6;
  cursor: default;
  box-shadow: none;
}

.tabs {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 18px 10px;
  flex: 0 0 auto;
}

.mode-switch {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius);
  background: var(--neutral-soft);
  flex: 0 0 auto;
}

.mode-switch button {
  height: 26px;
  padding: 0 14px;
  border-radius: var(--radius-sm);
  color: var(--text-2);
  font-size: var(--font-sm);
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}

.mode-switch button.on {
  background: var(--surface-solid);
  box-shadow: var(--shadow-1);
  color: var(--text);
  font-weight: 500;
}

/* 子页签做成下划线样式，和上面的分段控件区分开 */
.sub {
  display: flex;
  gap: 2px;
  min-width: 0;
  overflow: auto;
}

.sub-tab {
  position: relative;
  height: 30px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  color: var(--text-3);
  font-size: var(--font-sm);
  white-space: nowrap;
  transition: color 0.14s, background 0.14s;
}

.sub-tab:hover {
  color: var(--text);
  background: var(--hover);
}

.sub-tab.on {
  color: var(--text);
  font-weight: 500;
}

.sub-tab.on::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: var(--accent);
}

.sub-tab .count {
  margin-left: 5px;
  color: var(--text-3);
  font-size: var(--font-xs);
  font-weight: 400;
}

.spacer {
  flex: 1;
}

.dirty {
  flex: 0 0 auto;
  color: var(--amber);
  font-size: var(--font-xs);
}

/* 表区做成一张卡片：内容有边界，不会白成一片 */
.pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin: 0 18px 18px;
  padding: 10px 12px 14px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface-soft);
}

/* ---- 继承的请求头 ---- */
.inherited {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px dashed var(--border-strong);
}

.sec-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 8px 4px;
  color: var(--text-2);
  font-size: var(--font-sm);
  font-weight: 500;
}

.sec-title span {
  color: var(--text-3);
  font-size: var(--font-xs);
  font-weight: 400;
}

.inh-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.inh-row {
  display: grid;
  grid-template-columns: 1fr 1.5fr auto;
  align-items: center;
  gap: 12px;
  height: 32px;
  padding: 0 10px;
  border-radius: var(--radius-sm);
  background: var(--field);
}

.inh-key {
  color: var(--code-key);
  font-family: var(--mono);
  font-size: var(--font-sm);
}

.inh-value {
  overflow: hidden;
  color: var(--text-2);
  font-family: var(--mono);
  font-size: var(--font-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inh-source {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: var(--font-xs);
}

.inh-source.global {
  background: var(--accent-soft);
  color: var(--accent);
}

.inh-source.env {
  background: var(--green-soft);
  color: var(--green);
}

.inh-empty {
  margin: 0 4px;
  color: var(--text-3);
  font-size: var(--font-xs);
}
</style>
