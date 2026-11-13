<script setup lang="ts">
/**
 * 请求编辑区：方法 + 地址 + 请求头 / 请求体
 *
 * 注意：这里没有用 v-model 向父组件抛事件，而是直接修改 props.request 上的字段。
 * 因为 request 是 store 里的响应式对象，直接改最省代码，改完自动存盘。
 */
import { computed, ref } from 'vue'
import type { ApiRequest, BodyType } from '../types'
import KeyValueEditor from './KeyValueEditor.vue'

const props = defineProps<{
  request: ApiRequest
  sending: boolean
}>()

const emit = defineEmits<{ send: [] }>()

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: 'none', label: '无' },
  { value: 'json', label: 'JSON' },
  { value: 'text', label: '文本' },
]

const tab = ref<'headers' | 'body'>('headers')

/** 只有填了键名、且被勾选的请求头才计数 */
const headerCount = computed(
  () => props.request.headers.filter((h) => h.enabled && h.key.trim()).length,
)

const bodyPlaceholder = computed(() =>
  props.request.bodyType === 'json' ? '{\n  "name": "apix"\n}' : '请求体内容…',
)
</script>

<template>
  <section class="editor">
    <!-- 请求地址栏 -->
    <div class="bar">
      <div class="method-wrap">
        <select v-model="request.method" class="method" :class="`m-${request.method}`">
          <option v-for="method in METHODS" :key="method" :value="method">{{ method }}</option>
        </select>
        <svg class="chevron" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 4l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>

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

    <!-- 请求头 / 请求体 切换 -->
    <div class="tabs">
      <button class="tab" :class="{ on: tab === 'headers' }" @click="tab = 'headers'">
        请求头<span v-if="headerCount" class="count">{{ headerCount }}</span>
      </button>
      <button class="tab" :class="{ on: tab === 'body' }" @click="tab = 'body'">
        请求体<span v-if="request.bodyType !== 'none'" class="dot" />
      </button>
      <span class="hint">⌘↵ 发送</span>
    </div>

    <div class="pane">
      <KeyValueEditor v-if="tab === 'headers'" :rows="request.headers" />

      <template v-else>
        <div class="segmented">
          <button
            v-for="item in BODY_TYPES"
            :key="item.value"
            :class="{ on: request.bodyType === item.value }"
            @click="request.bodyType = item.value"
          >
            {{ item.label }}
          </button>
        </div>

        <textarea
          v-if="request.bodyType !== 'none'"
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

.method-wrap {
  position: relative;
  flex: 0 0 auto;
}

.method {
  width: 100px;
  height: 34px;
  padding: 0 24px 0 10px;
  appearance: none;
  border: 1px solid transparent;
  border-radius: 7px;
  background: #f6f6f4;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.method:hover {
  border-color: var(--border-strong);
}

.chevron {
  position: absolute;
  top: 12px;
  right: 8px;
  color: var(--text-3);
  pointer-events: none;
}

/* 方法名的配色见 styles.css 里的 .m-* （侧边栏也要用，所以放全局） */

.url {
  flex: 1;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: #fbfbfa;
  font-family: var(--mono);
  font-size: 12.5px;
  transition: border-color 0.12s, box-shadow 0.12s, background 0.12s;
}

.url:focus {
  border-color: var(--accent);
  background: var(--surface);
  box-shadow: 0 0 0 3px rgb(59 91 219 / 10%);
}

.send {
  flex: 0 0 auto;
  height: 34px;
  padding: 0 20px;
  border-radius: 7px;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.12s;
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
  gap: 18px;
  height: 38px;
  padding: 0 18px;
  border-bottom: 1px solid var(--border);
  flex: 0 0 auto;
}

.tab {
  position: relative;
  height: 100%;
  color: var(--text-2);
  font-size: 12.5px;
  transition: color 0.12s;
}

.tab:hover {
  color: var(--text);
}

.tab.on {
  color: var(--text);
}

.tab.on::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--accent);
}

.count {
  margin-left: 5px;
  color: var(--text-3);
  font-size: 11px;
}

.dot {
  display: inline-block;
  width: 4px;
  height: 4px;
  margin-left: 5px;
  border-radius: 50%;
  background: var(--accent);
  vertical-align: middle;
}

.hint {
  margin-left: auto;
  color: var(--text-3);
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

.segmented {
  display: flex;
  align-self: flex-start;
  padding: 2px;
  border-radius: 7px;
  background: #f4f4f1;
}

.segmented button {
  padding: 3px 12px;
  border-radius: 5px;
  color: var(--text-2);
  font-size: 12px;
  transition: background 0.12s, color 0.12s;
}

.segmented button.on {
  color: var(--text);
  background: var(--surface);
  box-shadow: 0 1px 2px rgb(0 0 0 / 6%);
}

.body-input {
  flex: 1;
  min-height: 120px;
  margin-top: 10px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: #fbfbfa;
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
