<script setup lang="ts">
/**
 * 请求编辑区：方法 + 地址 + 请求头 / 请求体
 *
 * 直接修改 props.request 上的字段（它是 store 里的响应式对象），改完自动存盘，
 * 所以不需要向父组件抛一堆 v-model 事件。
 */
import { computed, ref } from 'vue'
import type { ApiRequest, BodyType } from '../types'
import KeyValueEditor from './KeyValueEditor.vue'
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

const headerCount = computed(
  () => props.request.headers.filter((h) => h.enabled && h.key.trim()).length,
)

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
          请求头<span v-if="headerCount" class="count">{{ headerCount }}</span>
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

        <!-- 只有 JSON 才需要格式化 -->
        <template v-if="request.bodyType === 'json'">
          <span class="divider" />
          <button class="text-btn" @click="beautify">格式化</button>
        </template>
      </div>
    </div>

    <div class="pane">
      <KeyValueEditor
        v-if="tab === 'headers'"
        :rows="request.headers"
        :suggestions="HEADER_SUGGESTIONS"
        key-placeholder="键名"
        value-placeholder="值"
      />

      <template v-else>
        <KeyValueEditor
          v-if="request.bodyType === 'form'"
          :rows="request.form"
          key-placeholder="字段名"
          value-placeholder="字段值"
        />

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
  background: var(--surface);
}

.bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border);
  flex: 0 0 auto;
}

.url {
  flex: 1;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--field);
  font-family: var(--mono);
  font-size: 12.5px;
  transition: border-color 0.12s, box-shadow 0.12s, background 0.12s;
}

.url:focus {
  border-color: var(--accent);
  background: var(--surface);
  box-shadow: 0 0 0 3px rgb(59 91 219 / 12%);
}

.send {
  flex: 0 0 auto;
  height: 34px;
  padding: 0 20px;
  border-radius: 7px;
  background: var(--accent);
  color: var(--accent-contrast);
  font-size: 13px;
  font-weight: 500;
  transition: background 0.12s, opacity 0.12s;
}

.send:hover:not(:disabled) {
  background: var(--accent-hover);
}

.send:disabled {
  opacity: 0.55;
  cursor: default;
}

.tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 40px;
  padding: 0 18px;
  border-bottom: 1px solid var(--border);
  flex: 0 0 auto;
}

.tab-group {
  display: flex;
  gap: 2px;
}

.tab {
  display: flex;
  align-items: center;
  height: 27px;
  padding: 0 11px;
  border-radius: 6px;
  color: var(--text-2);
  font-size: 12.5px;
  transition: background 0.12s, color 0.12s;
}

.tab:hover {
  background: var(--hover);
  color: var(--text);
}

.tab.on {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 500;
}

.count {
  margin-left: 5px;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 400;
}

.dot {
  width: 4px;
  height: 4px;
  margin-left: 5px;
  border-radius: 50%;
  background: var(--accent);
}

.body-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.text-btn {
  color: var(--text-3);
  font-size: 12px;
  transition: color 0.12s;
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
  height: 12px;
  background: var(--border);
}

.format-error {
  color: var(--red);
  font-size: 11.5px;
}

.pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
  padding: 12px 18px 18px;
}

.body-input {
  flex: 1;
  min-height: 120px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--field);
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.7;
  resize: none;
  transition: border-color 0.12s, background 0.12s;
}

.body-input:focus {
  border-color: var(--accent);
  background: var(--surface);
}

.empty {
  margin: 22px 0;
  color: var(--text-3);
  font-size: 12.5px;
  text-align: center;
}
</style>
