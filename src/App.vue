<script setup lang="ts">
/**
 * 应用外壳
 *
 * 两个页面：项目列表（首页）和项目内工作区。
 * 工作区 = 顶栏 + 左侧接口树 + 右侧（请求编辑 / 响应）上下分栏。
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ProjectList from './components/ProjectList.vue'
import TopBar from './components/TopBar.vue'
import Sidebar from './components/Sidebar.vue'
import RequestEditor from './components/RequestEditor.vue'
import ResponsePanel from './components/ResponsePanel.vue'
import ContextMenu from './components/ContextMenu.vue'
import SettingsDialog from './components/SettingsDialog.vue'
import type { ApiRequest } from './types'
import { activeRequest, resolveVariables } from './store/workspace'
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
 * 1. 变量替换（{{baseUrl}} 之类）
 * 2. 表单类型整理成字段列表（文本 + 文件的 base64）
 * 3. 没手动写 Content-Type 时，按请求体类型自动补一个
 *    （表单例外：multipart 的 boundary 必须由发送方生成，这里不能写死）
 */
function buildPayload(request: ApiRequest) {
  const headers = request.headers
    .filter((row) => row.enabled && row.key.trim())
    .map((row) => ({
      id: row.id,
      key: resolveVariables(row.key),
      value: resolveVariables(row.value),
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
        // 文件内容只存在内存里；没选到（比如刷新过页面）就跳过这个字段
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

  return { method: request.method, url: resolveVariables(request.url.trim()), headers, body, formFields }
}

async function handleSend() {
  const request = activeRequest.value
  if (!request || sending.value) return

  if (!request.url.trim()) {
    response.value = {
      status: 0,
      statusText: '',
      durationMs: 0,
      size: 0,
      headers: [],
      body: '',
      error: '请先填写请求地址',
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
const editorHeight = ref(42)
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
</template>

<style scoped>
.project-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.workspace {
  flex: 1;
  min-height: 0;
  display: flex;
}

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--surface);
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
  flex: 0 0 7px;
  cursor: row-resize;
}

.splitter::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 3px;
  height: 1px;
  background: var(--border);
  transition: background 0.12s;
}

.splitter:hover::after {
  background: var(--accent);
}

.none {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 100%;
  color: var(--text-3);
  font-size: 12.5px;
}

.none p {
  margin: 0;
  color: var(--text-2);
}

.none span {
  font-size: 11.5px;
}
</style>
