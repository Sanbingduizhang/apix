<script setup lang="ts">
/**
 * 应用外壳
 *
 * 两个页面：项目列表（首页）和项目内工作区。
 * 工作区 = 顶栏 + 左侧接口树 + 右侧（请求编辑 / 响应）上下分栏，三块都是悬浮面板。
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
import { activeRequest, effectiveHeaders, isAbsoluteUrl, resolveUrl, resolveVariables } from './store/workspace'
import { getFile } from './store/fileCache'
import { sendHttpRequest, type FormField, type SendResult } from './api/http'

const view = ref<'list' | 'project'>('list')
const settingsOpen = ref(false)
const sending = ref(false)
const response = ref<SendResult | null>(null)

// 切换接口时清空上一条响应，避免看串
watch(
  () => activeRequest.value?.id,
  () => {
    response.value = null
  },
)

/**
 * 把界面上的请求整理成可以发出去的形状：
 * 1. 合并请求头（全局参数 + 环境参数 + 请求自己的，后者覆盖前者）
 * 2. 变量替换（{{baseUrl}} 之类）
 * 3. 表单整理成字段列表（文本 + 文件的 base64）
 * 4. 没手写 Content-Type 时按请求体类型补一个（表单除外，boundary 必须由发送方生成）
 */
function buildPayload(request: ApiRequest) {
  const headers = effectiveHeaders(request).map((item) => ({
    id: item.key,
    key: resolveVariables(item.key),
    value: resolveVariables(item.value),
    enabled: true,
  }))

  const hasContentType = headers.some((row) => row.key.toLowerCase() === 'content-type')
  let body: string | null = null
  let formFields: FormField[] | undefined

  if (request.bodyType === 'json') {
    body = resolveVariables(request.body)
    if (!hasContentType) {
      headers.push({ id: 'auto', key: 'Content-Type', value: 'application/json', enabled: true })
    }
  } else if (request.bodyType === 'text') {
    body = resolveVariables(request.body)
  } else if (request.bodyType === 'form') {
    formFields = []
    for (const row of request.form) {
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
  }

  return {
    method: request.method,
    url: resolveUrl(request.url),
    headers,
    body,
    formFields,
  }
}

async function handleSend() {
  const request = activeRequest.value
  if (!request || sending.value) return

  // 先把地址拼好（可能要用到环境前缀），不合法就不发出去
  const target = resolveUrl(request.url)
  const problem = !target
    ? '请先填写请求地址'
    : !isAbsoluteUrl(target)
      ? '地址要以 http:// 或 https:// 开头，或者给当前环境设置一个请求前缀'
      : ''

  if (problem) {
    response.value = {
      status: 0,
      statusText: '',
      durationMs: 0,
      size: 0,
      headers: [],
      body: '',
      error: problem,
    }
    return
  }

  sending.value = true
  response.value = null
  try {
    response.value = await sendHttpRequest(buildPayload(request))
  } catch (error: any) {
    response.value = {
      status: 0,
      statusText: '',
      durationMs: 0,
      size: 0,
      headers: [],
      body: '',
      error: error?.message ?? String(error),
    }
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
const editorHeight = ref(45)
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
            v-if="activeRequest"
            :request="activeRequest"
            :sending="sending"
            @send="handleSend"
            @settings="settingsOpen = true"
          />
          <div v-else class="none">
            <p>从左侧选择一个接口</p>
            <span>右键或点 + 可以新建接口 / 目录</span>
          </div>
        </div>

        <div class="splitter" @mousedown="startDrag" />

        <ResponsePanel :response="response" :sending="sending" />
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
