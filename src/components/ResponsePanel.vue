<script setup lang="ts">
/**
 * 响应面板：状态码 / 耗时 / 大小 + 响应体 / 响应头 / Cookies / 实际发出的请求
 */
import { computed, ref } from 'vue'
import type { RequestSnapshot, SendResult } from '../api/http'
import JsonView from './JsonView.vue'

const props = defineProps<{
  response: SendResult | null
  sending: boolean
  /** 上一次实际发出的请求 */
  request: RequestSnapshot | null
}>()

type Tab = 'body' | 'headers' | 'cookies' | 'request'

const tab = ref<Tab>('body')
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

/** 一张 Cookie 卡片上的信息 */
interface Cookie {
  name: string
  value: string
  domain: string
  path: string
  expires: string
  httpOnly: boolean
  secure: boolean
}

/**
 * 解析 set-cookie。
 * 有的运行时会把多个 cookie 合成一个头（用逗号分隔），所以先按 ",名字=" 拆一刀再解析。
 */
function parseSetCookie(headers: [string, string][]): Cookie[] {
  const result: Cookie[] = []
  for (const [key, raw] of headers) {
    if (key.toLowerCase() !== 'set-cookie') continue
    for (const piece of raw.split(/,(?=\s*[\w.-]+=)/)) {
      const parts = piece.split(';').map((item) => item.trim()).filter(Boolean)
      const [pair, ...attrs] = parts
      if (!pair) continue

      const index = pair.indexOf('=')
      const cookie: Cookie = {
        name: index >= 0 ? pair.slice(0, index) : pair,
        value: index >= 0 ? pair.slice(index + 1) : '',
        domain: '',
        path: '',
        expires: '',
        httpOnly: false,
        secure: false,
      }

      for (const attr of attrs) {
        const at = attr.indexOf('=')
        const name = (at < 0 ? attr : attr.slice(0, at)).trim().toLowerCase()
        const value = at < 0 ? '' : attr.slice(at + 1).trim()
        if (name === 'domain') cookie.domain = value
        else if (name === 'path') cookie.path = value
        else if (name === 'expires' || name === 'max-age') cookie.expires = cookie.expires || value
        else if (name === 'httponly') cookie.httpOnly = true
        else if (name === 'secure') cookie.secure = true
      }

      result.push(cookie)
    }
  }
  return result
}

const cookies = computed(() => parseSetCookie(props.response?.headers ?? []))

/** 当前有哪些页签可以看 */
const tabs = computed(() => [
  { value: 'body' as const, label: '响应体', count: 0 },
  { value: 'headers' as const, label: '响应头', count: props.response?.headers.length ?? 0 },
  { value: 'cookies' as const, label: 'Cookies', count: cookies.value.length },
  { value: 'request' as const, label: '请求', count: 0 },
])

/** 复制当前页签的内容到剪贴板 */
async function copyContent() {
  const text =
    tab.value === 'request'
      ? [props.request?.url ?? '', ...(props.request?.headers ?? []).map(([k, v]) => `${k}: ${v}`), props.request?.body ?? ''].join('\n')
      : (props.response?.body ?? '')
  if (!text) return
  await navigator.clipboard.writeText(text)
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
          <button v-for="item in tabs" :key="item.value" :class="{ on: tab === item.value }" @click="tab = item.value">
            {{ item.label }}
            <span v-if="item.count" class="tab-count">{{ item.count }}</span>
          </button>
        </div>
        <button class="copy" @click="copyContent">{{ copied ? '已复制' : '复制' }}</button>
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
        <!-- 响应体 -->
        <JsonView v-if="tab === 'body'" :text="response.body" />

        <!-- 响应头 -->
        <div v-else-if="tab === 'headers'" class="headers">
          <div v-for="([key, value], i) in response.headers" :key="i" class="h-row">
            <span class="h-key">{{ key }}</span>
            <span class="h-value">{{ value }}</span>
          </div>
        </div>

        <!-- Cookies -->
        <div v-else-if="tab === 'cookies'" class="cookies">
          <template v-if="cookies.length">
            <div class="c-row head">
              <span>名称</span>
              <span>值</span>
              <span>Domain</span>
              <span>Path</span>
              <span>过期时间</span>
            </div>
            <div v-for="(cookie, i) in cookies" :key="i" class="c-row">
              <span class="c-name">{{ cookie.name }}</span>
              <span class="c-value" :title="cookie.value">{{ cookie.value }}</span>
              <span class="c-meta">{{ cookie.domain || '—' }}</span>
              <span class="c-meta">{{ cookie.path || '—' }}</span>
              <span class="c-meta">
                {{ cookie.expires || '会话结束时失效' }}
                <em v-if="cookie.httpOnly">HttpOnly</em>
                <em v-if="cookie.secure">Secure</em>
              </span>
            </div>
          </template>
          <p v-else class="empty">这次响应没有设置 Cookie（没有 Set-Cookie 响应头）</p>
        </div>

        <!-- 实际发出的请求 -->
        <div v-else class="sent">
          <template v-if="request">
            <p class="sent-line">
              <span class="sent-method" :class="`m-${request.method}`">{{ request.method }}</span>
              <code class="sent-url">{{ request.url }}</code>
            </p>

            <p class="sent-title">请求头</p>
            <div class="headers">
              <div v-for="([key, value], i) in request.headers" :key="i" class="h-row">
                <span class="h-key">{{ key }}</span>
                <span class="h-value">{{ value }}</span>
              </div>
            </div>

            <template v-if="request.body">
              <p class="sent-title">请求体</p>
              <pre class="sent-body">{{ request.body }}</pre>
            </template>
          </template>
          <p v-else class="empty">还没有发送过请求</p>
        </div>
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

/* 顶栏用一层淡底，和下面的内容区分开 */
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 50px;
  padding: 0 18px;
  border-bottom: 1px solid var(--border);
  background: var(--neutral-soft);
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
  color: var(--accent);
  background: var(--accent-soft);
  font-weight: 500;
}

.tab-count {
  margin-left: 5px;
  color: var(--text-3);
  font-size: var(--font-xs);
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
  font-weight: 600;
}

.error-msg {
  margin: 0;
  color: var(--text-2);
  font-family: var(--mono);
  font-size: var(--font-sm);
  word-break: break-all;
}

.headers {
  display: flex;
  flex-direction: column;
}

.h-row {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
}

.h-row:hover {
  background: var(--field);
}

.h-key {
  color: var(--code-key);
  font-family: var(--mono);
  font-size: var(--font-sm);
  word-break: break-all;
}

.h-value {
  color: var(--text-2);
  font-family: var(--mono);
  font-size: var(--font-sm);
  word-break: break-all;
}

/* ---- Cookies ---- */
.c-row {
  display: grid;
  grid-template-columns: minmax(110px, 1fr) minmax(150px, 2fr) minmax(90px, 1fr) 70px minmax(140px, 1.4fr);
  gap: 14px;
  align-items: center;
  padding: 7px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
}

.c-row:not(.head):hover {
  background: var(--field);
}

.c-row.head {
  color: var(--text-3);
  font-size: var(--font-xs);
}

.c-name {
  overflow: hidden;
  color: var(--code-key);
  font-family: var(--mono);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.c-value {
  overflow: hidden;
  color: var(--text-2);
  font-family: var(--mono);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.c-meta {
  overflow: hidden;
  color: var(--text-3);
  font-size: var(--font-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.c-meta em {
  margin-left: 6px;
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 10px;
  font-style: normal;
}

/* ---- 实际发出的请求 ---- */
.sent-line {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--field);
}

.sent-method {
  font-family: var(--mono);
  font-size: var(--font-xs);
  font-weight: 600;
}

.sent-url {
  overflow: hidden;
  color: var(--text);
  font-family: var(--mono);
  font-size: var(--font-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sent-title {
  margin: 16px 0 6px;
  color: var(--text-3);
  font-size: var(--font-xs);
}

.sent-body {
  margin: 0;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--field);
  font-family: var(--mono);
  font-size: var(--font-sm);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
}

.empty {
  margin: 26px 0;
  color: var(--text-3);
  font-size: var(--font-sm);
  text-align: center;
}
</style>
