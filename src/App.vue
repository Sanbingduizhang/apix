<script setup lang="ts">
/**
 * 应用外壳
 *
 * 两个页面：项目列表（首页）和项目内工作区。
 * 工作区 = 顶栏 + 左侧接口树 + 右侧（请求编辑 / 响应）上下分栏，三块都是悬浮面板。
 *
 * 编辑区改的是草稿（store/draft.ts），这里负责把草稿整理成真正能发出去的请求。
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ProjectList from './components/ProjectList.vue'
import TopBar from './components/TopBar.vue'
import Sidebar from './components/Sidebar.vue'
import RequestEditor from './components/RequestEditor.vue'
import ResponsePanel from './components/ResponsePanel.vue'
import ContextMenu from './components/ContextMenu.vue'
import SettingsDialog from './components/SettingsDialog.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import type { ApiRequest } from './types'
import {
  effectiveHeaders,
  fillPathParams,
  isAbsoluteUrl,
  pathVariables,
  resolveUrl,
  resolveVariables,
} from './store/workspace'
import { draft } from './store/draft'
import { getFile } from './store/fileCache'
import { rowsToObject } from './api/body'
import { sendHttpRequest, type FormField, type RequestSnapshot, type SendResult } from './api/http'

const view = ref<'list' | 'project'>('list')
const settingsOpen = ref(false)
const sending = ref(false)
const response = ref<SendResult | null>(null)
/** 上一次实际发出去的请求，响应面板里可以回看 */
const lastRequest = ref<RequestSnapshot | null>(null)

// 切换接口时清空上一条响应，避免看串
watch(
  () => draft.value?.id,
  () => {
    response.value = null
    lastRequest.value = null
  },
)

/** base64：先用 TextEncoder 转字节，避免中文用户名直接 btoa 报错 */
function base64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/**
 * 把界面上的请求整理成可以发出去的形状：
 * 1. 路径变量替换 -> 变量替换 -> 拼环境前缀
 * 2. 查询参数 + API Key（放在 query 时）拼到地址后面
 * 3. 请求头：全局 + 环境 + 请求 + 鉴权，同名的后者覆盖前者
 * 4. 请求体按类型整理：JSON（源码或键值）/ urlencoded / multipart / 文本
 */
function buildPayload(request: ApiRequest) {
  let url = resolveUrl(fillPathParams(request.url, request.pathParams))

  const query: string[] = []
  for (const row of request.params) {
    if (!row.enabled || !row.key.trim()) continue
    const key = encodeURIComponent(resolveVariables(row.key.trim()))
    const value = encodeURIComponent(resolveVariables(row.value))
    query.push(`${key}=${value}`)
  }

  // 鉴权：转成请求头，或者拼进查询参数
  const authHeaders: { key: string; value: string }[] = []
  const auth = request.auth
  if (auth.type === 'bearer' && auth.token.trim()) {
    authHeaders.push({ key: 'Authorization', value: `Bearer ${resolveVariables(auth.token)}` })
  } else if (auth.type === 'basic') {
    const pair = `${resolveVariables(auth.username)}:${resolveVariables(auth.password)}`
    authHeaders.push({ key: 'Authorization', value: `Basic ${base64(pair)}` })
  } else if (auth.type === 'apikey' && auth.key.trim()) {
    const key = resolveVariables(auth.key.trim())
    const value = resolveVariables(auth.value)
    if (auth.position === 'header') authHeaders.push({ key, value })
    else query.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  }

  if (query.length) url += `${url.includes('?') ? '&' : '?'}${query.join('&')}`

  // 请求头用 Map 合并，键名统一小写比较，避免 Content-Type 出现两份
  const headerMap = new Map<string, { id: string; key: string; value: string; enabled: boolean }>()
  for (const item of effectiveHeaders(request)) {
    headerMap.set(item.key.toLowerCase(), {
      id: item.key,
      key: resolveVariables(item.key),
      value: resolveVariables(item.value),
      enabled: true,
    })
  }
  for (const item of authHeaders) {
    headerMap.set(item.key.toLowerCase(), { id: item.key, key: item.key, value: item.value, enabled: true })
  }
  const headers = [...headerMap.values()]
  const hasContentType = headers.some((row) => row.key.toLowerCase() === 'content-type')

  let body: string | null = null
  let formFields: FormField[] | undefined

  // GET / HEAD 带请求体会被浏览器和 Node 的 fetch 直接拒绝，这里主动丢掉
  const method = request.method.toUpperCase()
  const bodyAllowed = method !== 'GET' && method !== 'HEAD'

  if (!bodyAllowed) {
    body = null
  } else if (request.bodyType === 'json') {
    body =
      request.bodyMode === 'rows'
        ? JSON.stringify(rowsToObject(request.rows), null, 2)
        : resolveVariables(request.body)
    if (!hasContentType) {
      headers.push({ id: 'auto', key: 'Content-Type', value: 'application/json', enabled: true })
    }
  } else if (request.bodyType === 'urlencoded') {
    const params = new URLSearchParams()
    for (const row of request.rows) {
      if (row.enabled && row.key.trim()) {
        params.append(resolveVariables(row.key), resolveVariables(row.value))
      }
    }
    body = params.toString()
    if (!hasContentType) {
      headers.push({
        id: 'auto',
        key: 'Content-Type',
        value: 'application/x-www-form-urlencoded',
        enabled: true,
      })
    }
  } else if (request.bodyType === 'form') {
    // multipart：文件的真实内容在内存缓存里
    formFields = []
    for (const row of request.rows) {
      if (!row.enabled || !row.key.trim()) continue
      const key = resolveVariables(row.key)

      if (row.type === 'file') {
        const cached = getFile(row.id)
        if (!cached) continue
        formFields.push({
          key,
          type: 'file',
          value: '',
          fileName: cached.name,
          fileType: cached.type,
          fileBase64: cached.base64,
        })
      } else {
        formFields.push({ key, type: 'text', value: resolveVariables(row.value) })
      }
    }
  } else if (request.bodyType === 'text') {
    body = resolveVariables(request.body)
  }

  return { method: request.method, url, headers, body, formFields }
}

/** 把发出去的请求留一份快照，响应面板里可以回看 */
function snapshotOf(payload: ReturnType<typeof buildPayload>): RequestSnapshot {
  const formText = payload.formFields
    ?.map((field) =>
      field.type === 'file' ? `${field.key}: <文件 ${field.fileName ?? ''}>` : `${field.key}: ${field.value}`,
    )
    .join('\n')

  return {
    method: payload.method,
    url: payload.url,
    headers: payload.headers.map((row) => [row.key, row.value] as [string, string]),
    body: formText ?? payload.body,
  }
}

function fail(message: string) {
  response.value = {
    status: 0,
    statusText: '',
    durationMs: 0,
    size: 0,
    headers: [],
    body: '',
    error: message,
  }
}

async function handleSend() {
  const request = draft.value
  if (!request || sending.value) return

  const payload = buildPayload(request)
  // 地址可能来自路径变量或环境前缀，拼完再判断
  if (!payload.url) return fail('请先填写请求地址')
  if (!isAbsoluteUrl(payload.url)) {
    return fail('地址要以 http:// 或 https:// 开头，或者给当前环境设置一个请求前缀')
  }
  // 地址里还留着 :id 这种占位，说明路径变量没填
  const missing = pathVariables(payload.url)[0]
  if (missing) return fail(`地址里的路径变量「${missing}」还没填值，去 Path 页签补一下`)

  sending.value = true
  response.value = null
  lastRequest.value = snapshotOf(payload)
  try {
    response.value = await sendHttpRequest(payload)
  } catch (error: any) {
    fail(error?.message ?? String(error))
  } finally {
    sending.value = false
  }
}

/** ⌘ + Enter 发送 */
function onKeydown(event: KeyboardEvent) {
  if (view.value !== 'project') return
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    handleSend()
  }
}

// ---------------- 上下分栏拖拽 ----------------

const mainRef = ref<HTMLElement | null>(null)
const editorHeight = ref(48)
let dragging = false

function startDrag(event: MouseEvent) {
  dragging = true
  event.preventDefault()
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

function onDrag(event: MouseEvent) {
  if (!dragging || !mainRef.value) return
  const rect = mainRef.value.getBoundingClientRect()
  const percent = ((event.clientY - rect.top) / rect.height) * 100
  editorHeight.value = Math.min(78, Math.max(22, percent))
}

function stopDrag() {
  dragging = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  stopDrag()
})
</script>

<template>
  <!-- 背景装饰：一团柔光 + 两道缓慢转动的弧线，纯 CSS 画的，不占 DOM 逻辑 -->
  <div class="ambient" aria-hidden="true">
    <span class="orb orb-1" />
    <span class="orb orb-2" />
    <span class="arc arc-1" />
    <span class="arc arc-2" />
    <span class="grid" />
  </div>

  <ProjectList v-if="view === 'list'" @open="view = 'project'" />

  <div v-else class="project-view">
    <TopBar @back="view = 'list'" @settings="settingsOpen = true" />

    <div class="workspace">
      <Sidebar />

      <main ref="mainRef" class="main">
        <div class="editor-slot" :style="{ height: `${editorHeight}%` }">
          <RequestEditor
            v-if="draft"
            :request="draft"
            :sending="sending"
            @send="handleSend"
            @settings="settingsOpen = true"
            @resize="editorHeight = $event"
          />
          <div v-else class="none">
            <p>从左侧选择一个接口</p>
            <span>右键或点 + 可以新建接口 / 目录</span>
          </div>
        </div>

        <div class="splitter" @mousedown="startDrag" />

        <ResponsePanel :response="response" :sending="sending" :request="lastRequest" />
      </main>
    </div>
  </div>

  <ContextMenu />
  <SettingsDialog :open="settingsOpen" @close="settingsOpen = false" />
  <ConfirmDialog />
</template>

<style scoped>
.project-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100vh;
  padding: 14px;
  overflow: hidden;
}

.workspace {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 14px;
}

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
  background: var(--surface);
  backdrop-filter: var(--blur);
  box-shadow: var(--shadow-2);
}

.editor-slot {
  flex: 0 0 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.editor-slot > * {
  flex: 1;
  min-height: 0;
}

/* 分割线很细，划过时变强调色，提示这里能拖 */
.splitter {
  position: relative;
  flex: 0 0 9px;
  cursor: row-resize;
}

.splitter::after {
  content: '';
  position: absolute;
  left: 18px;
  right: 18px;
  top: 4px;
  height: 1px;
  background: var(--border);
  transition: background 0.15s;
}

.splitter:hover::after {
  background: var(--accent);
}

.none {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  color: var(--text-3);
  font-size: var(--font-sm);
}

.none p {
  margin: 0;
  color: var(--text-2);
}

.none span {
  font-size: var(--font-xs);
}
</style>
