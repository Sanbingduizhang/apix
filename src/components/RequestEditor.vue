<script setup lang="ts">
/**
 * 请求编辑区：方法 + 地址 + 请求头 / 请求体
 *
 * 直接修改 props.request 上的字段（它是 store 里的响应式对象），改完自动存盘。
 * 请求头页签下半部分会列出"继承的请求头"：来自全局参数和环境参数，随请求一起发出去。
 */
import { computed, ref } from 'vue'
import type { ApiRequest, BodyType } from '../types'
import { availableVariables, effectiveHeaders } from '../store/workspace'
import KeyValueEditor from './KeyValueEditor.vue'
import FormEditor from './FormEditor.vue'
import MethodSelect from './MethodSelect.vue'

const props = defineProps<{
  request: ApiRequest
  sending: boolean
}>()

const emit = defineEmits<{ send: [] }>()

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: 'none', label: '无' },
  { value: 'json', label: 'JSON' },
  { value: 'form', label: '表单' },
  { value: 'text', label: '文本' },
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

const tab = ref<'headers' | 'body'>('headers')
const formatError = ref('')

/** 这个请求最终会带上的头（含继承），用来算数量和展示 */
const mergedHeaders = computed(() => effectiveHeaders(props.request))
const inherited = computed(() => mergedHeaders.value.filter((item) => item.source !== '请求'))
const variables = computed(() => availableVariables())

const bodyPlaceholder = computed(() =>
  props.request.bodyType === 'json' ? '{\n  "name": "apix"\n}' : '请求体内容…',
)

/** 把 JSON 重新缩进排版；格式不对就提示一下，不弹窗打断操作 */
function beautify() {
  try {
    props.request.body = JSON.stringify(JSON.parse(props.request.body), null, 2)
    formatError.value = ''
  } catch {
    formatError.value = 'JSON 格式有误'
    setTimeout(() => (formatError.value = ''), 2000)
  }
}
</script>

<template>
  <section class="editor">
    <!-- 地址栏 -->
    <div class="bar">
      <MethodSelect :model-value="request.method" @update:model-value="request.method = $event" />

      <input
        v-model="request.url"
        class="url"
        placeholder="https://api.example.com/users/1"
        spellcheck="false"
        autocomplete="off"
        @keydown.enter.exact="emit('send')"
      />

      <button class="send" :disabled="sending" @click="emit('send')">
        {{ sending ? '发送中' : '发送' }}
      </button>
    </div>

    <!-- 请求头 / 请求体 -->
    <div class="tabs">
      <div class="tab-group">
        <button class="tab" :class="{ on: tab === 'headers' }" @click="tab = 'headers'">
          请求头<span v-if="mergedHeaders.length" class="count">{{ mergedHeaders.length }}</span>
        </button>
        <button class="tab" :class="{ on: tab === 'body' }" @click="tab = 'body'">
          请求体<span v-if="request.bodyType !== 'none'" class="dot" />
        </button>
      </div>

      <div v-if="tab === 'body'" class="body-tools">
        <span v-if="formatError" class="format-error">{{ formatError }}</span>
        <button
          v-for="item in BODY_TYPES"
          :key="item.value"
          class="text-btn"
          :class="{ on: request.bodyType === item.value }"
          @click="request.bodyType = item.value"
        >
          {{ item.label }}
        </button>

        <template v-if="request.bodyType === 'json'">
          <span class="divider" />
          <button class="text-btn" @click="beautify">格式化</button>
        </template>
      </div>
    </div>

    <div class="pane">
      <template v-if="tab === 'headers'">
        <KeyValueEditor
          :rows="request.headers"
          :suggestions="HEADER_SUGGESTIONS"
          :variables="variables"
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

      <template v-else>
        <FormEditor v-if="request.bodyType === 'form'" :rows="request.form" />

        <textarea
          v-else-if="request.bodyType !== 'none'"
          v-model="request.body"
          class="body-input"
          :placeholder="bodyPlaceholder"
          spellcheck="false"
        />

        <p v-else class="empty">这个请求没有请求体</p>
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
  padding: 14px 18px;
  flex: 0 0 auto;
}

.url {
  flex: 1;
  height: var(--h-ctl);
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--field);
  font-family: var(--mono);
  font-size: var(--font-sm);
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}

.url:focus {
  border-color: var(--accent);
  background: var(--surface-solid);
  box-shadow: 0 0 0 4px var(--accent-soft);
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
  justify-content: space-between;
  gap: 12px;
  padding: 0 18px 10px;
  flex: 0 0 auto;
}

.tab-group {
  display: flex;
  gap: 3px;
  padding: 3px;
  border-radius: var(--radius);
  background: var(--neutral-soft);
}

.tab {
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 13px;
  border-radius: var(--radius-sm);
  color: var(--text-2);
  font-size: var(--font-sm);
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}

.tab:hover {
  color: var(--text);
}

.tab.on {
  background: var(--surface-solid);
  box-shadow: var(--shadow-1);
  color: var(--text);
  font-weight: 500;
}

.count {
  margin-left: 5px;
  color: var(--text-3);
  font-size: var(--font-xs);
  font-weight: 400;
}

.dot {
  width: 5px;
  height: 5px;
  margin-left: 5px;
  border-radius: 50%;
  background: var(--accent);
}

.body-tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.text-btn {
  color: var(--text-3);
  font-size: var(--font-sm);
  transition: color 0.14s;
}

.text-btn:hover {
  color: var(--text);
}

.text-btn.on {
  color: var(--accent);
  font-weight: 500;
}

.divider {
  width: 1px;
  height: 13px;
  background: var(--border);
}

.format-error {
  color: var(--red);
  font-size: var(--font-xs);
}

.pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
  padding: 4px 18px 18px;
}

.body-input {
  flex: 1;
  min-height: 120px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--field);
  font-family: var(--mono);
  font-size: var(--font-sm);
  line-height: 1.75;
  resize: none;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.body-input:focus {
  border-color: var(--accent);
  background: var(--surface-solid);
  box-shadow: 0 0 0 4px var(--accent-soft);
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

.empty {
  margin: 26px 0;
  color: var(--text-3);
  font-size: var(--font-sm);
  text-align: center;
}
</style>
