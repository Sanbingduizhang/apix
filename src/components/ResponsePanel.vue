<script setup lang="ts">
/**
 * 响应面板：状态码 / 耗时 / 大小 + 响应体 / 响应头
 */
import { computed, ref } from 'vue'
import type { SendResult } from '../api/http'
import JsonView from './JsonView.vue'

const props = defineProps<{
  response: SendResult | null
  sending: boolean
}>()

const tab = ref<'body' | 'headers'>('body')
const copied = ref(false)

/** 状态码对应的颜色：2xx 绿、4xx 橙、5xx 红 */
const statusClass = computed(() => {
  const status = props.response?.status ?? 0
  if (status >= 200 && status < 300) return 'ok'
  if (status >= 400 && status < 500) return 'warn'
  if (status >= 500) return 'err'
  return 'info'
})

/** 字节数转成好读的 KB / MB */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** 复制响应体到剪贴板 */
async function copyBody() {
  if (!props.response?.body) return
  await navigator.clipboard.writeText(props.response.body)
  copied.value = true
  setTimeout(() => (copied.value = false), 1200)
}
</script>

<template>
  <section class="panel">
    <header class="bar">
      <div class="status-area">
        <template v-if="sending">
          <span class="muted">请求中…</span>
        </template>

        <template v-else-if="response && response.error">
          <span class="status err">失败</span>
          <span class="muted">请求没有送达</span>
        </template>

        <template v-else-if="response">
          <span class="status" :class="statusClass">{{ response.status }}</span>
          <span class="muted">{{ response.statusText || '—' }}</span>
          <span class="sep">·</span>
          <span class="muted">{{ response.durationMs }} ms</span>
          <span class="sep">·</span>
          <span class="muted">{{ formatSize(response.size) }}</span>
        </template>

        <template v-else>
          <span class="muted">响应</span>
        </template>
      </div>

      <div v-if="response && !response.error" class="actions">
        <div class="switch">
          <button :class="{ on: tab === 'body' }" @click="tab = 'body'">响应体</button>
          <button :class="{ on: tab === 'headers' }" @click="tab = 'headers'">响应头</button>
        </div>
        <button class="copy" @click="copyBody">{{ copied ? '已复制' : '复制' }}</button>
      </div>
    </header>

    <div class="content">
      <!-- 还没发过请求 -->
      <div v-if="!response && !sending" class="placeholder">
        <span class="ph-icon">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <path
              d="M4 13h13m0 0l-4.5-4.5M17 13l-4.5 4.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M20 5.5h3.5v15H20"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              opacity="0.45"
            />
          </svg>
        </span>
        <p class="ph-title">还没有响应</p>
        <p class="ph-sub">填好地址后点「发送」，状态码、耗时和返回内容都会显示在这里</p>
        <div class="kbd-row">
          <span class="kbd">⌘</span><span class="kbd">↵</span>
          <span class="kbd-hint">发送</span>
        </div>
      </div>

      <!-- 网络层错误 -->
      <div v-else-if="response?.error" class="error">
        <p class="error-title">请求失败</p>
        <p class="error-msg">{{ response.error }}</p>
      </div>

      <template v-else-if="response">
        <div v-if="tab === 'headers'" class="headers">
          <div v-for="([key, value], i) in response.headers" :key="i" class="h-row">
            <span class="h-key">{{ key }}</span>
            <span class="h-value">{{ value }}</span>
          </div>
        </div>
        <JsonView v-else :text="response.body" />
      </template>
    </div>
  </section>
</template>

<style scoped>
.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 50px;
  padding: 0 18px;
  border-bottom: 1px solid var(--border);
  flex: 0 0 auto;
}

.status-area {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.status {
  padding: 3px 10px;
  border-radius: 999px;
  font-family: var(--mono);
  font-size: var(--font-sm);
  font-weight: 600;
}

.status.ok {
  color: var(--green);
  background: var(--green-soft);
}

.status.warn {
  color: var(--amber);
  background: var(--amber-soft);
}

.status.err {
  color: var(--red);
  background: var(--red-soft);
}

.status.info {
  color: var(--text-2);
  background: var(--neutral-soft);
}

.muted {
  color: var(--text-2);
  font-size: var(--font-sm);
}

.sep {
  color: var(--text-3);
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.switch {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-sm);
  background: var(--neutral-soft);
}

.switch button {
  padding: 4px 12px;
  border-radius: 7px;
  color: var(--text-2);
  font-size: var(--font-sm);
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}

.switch button.on {
  color: var(--text);
  background: var(--surface-solid);
  box-shadow: var(--shadow-1);
}

.copy {
  padding: 4px 10px;
  border-radius: 7px;
  color: var(--text-2);
  font-size: var(--font-sm);
  transition: color 0.14s, background 0.14s;
}

.copy:hover {
  background: var(--hover);
  color: var(--accent);
}

.content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px 18px 26px;
}

.placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-3);
  font-size: var(--font-sm);
}

/* 空状态给个柔和的图标底，比一行小字有分量 */
.ph-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  margin-bottom: 4px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--surface-soft);
  color: var(--text-3);
  box-shadow: var(--neu-out-sm);
}

.ph-title {
  margin: 0;
  color: var(--text-2);
  font-size: var(--font-md);
  font-weight: 500;
}

.ph-sub {
  max-width: 380px;
  margin: 0;
  color: var(--text-3);
  font-size: var(--font-xs);
  line-height: 1.7;
  text-align: center;
}

.kbd-row {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 4px;
}

.kbd-hint {
  margin-left: 6px;
  color: var(--text-3);
  font-size: var(--font-xs);
}

.kbd {
  display: inline-block;
  min-width: 20px;
  padding: 2px 5px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--surface-solid);
  box-shadow: 0 1px 0 var(--border);
  color: var(--text-2);
  font-size: 11px;
  text-align: center;
}

.error {
  padding: 12px 14px;
  border: 1px solid var(--red-soft);
  border-radius: var(--radius);
  background: var(--red-soft);
}

.error-title {
  margin: 0 0 4px;
  color: var(--red);
  font-size: var(--font-sm);
  font-weight: 500;
}

.error-msg {
  margin: 0;
  color: var(--text-2);
  font-family: var(--mono);
  font-size: var(--font-sm);
  line-height: 1.6;
  word-break: break-all;
}

.headers {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.h-row {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  font-family: var(--mono);
  font-size: var(--font-sm);
  line-height: 1.6;
}

.h-row:hover {
  background: var(--field);
}

.h-key {
  color: var(--code-key);
  word-break: break-all;
}

.h-value {
  color: var(--text-2);
  word-break: break-all;
}
</style>
