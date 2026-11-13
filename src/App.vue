<script setup lang="ts">
/**
 * 应用外壳：左侧栏 + 右侧（请求编辑 / 响应）上下分栏
 *
 * 这里只做三件事：
 *   1. 把请求交给 api/http.ts 去发；
 *   2. 管理"发送中 / 响应"这两个状态；
 *   3. 处理 ⌘+Enter 发送、以及中间那条可拖拽的分割线。
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Sidebar from './components/Sidebar.vue'
import RequestEditor from './components/RequestEditor.vue'
import ResponsePanel from './components/ResponsePanel.vue'
import { activeRequest, addRequest } from './store/workspace'
import { sendHttpRequest, type SendResult } from './api/http'

const response = ref<SendResult | null>(null)
const sending = ref(false)

// 切换接口时清空上一条响应，避免看串
watch(
  () => activeRequest.value?.id,
  () => {
    response.value = null
  },
)

/** 发送当前请求 */
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
    response.value = await sendHttpRequest({
      method: request.method,
      url: request.url.trim(),
      headers: request.headers,
      body: request.bodyType === 'none' ? null : request.body,
    })
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

/** ⌘ + Enter 也可以发送 */
function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    handleSend()
  }
}

// ---------- 上下分栏拖拽 ----------

const mainRef = ref<HTMLElement | null>(null)
const editorHeight = ref(42) // 上半部分占多少（百分比）
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
  // 留出上限下限，避免拖成一条线
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
  <div class="layout">
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
          <p>这个项目还没有接口</p>
          <button @click="addRequest()">新建一个接口</button>
        </div>
      </div>

      <div class="splitter" @mousedown="startDrag" />

      <ResponsePanel :response="response" :sending="sending" />
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
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

/* 分割线本身很细，鼠标划过时变强调色，提示"这里能拖" */
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
  gap: 10px;
  height: 100%;
  color: var(--text-3);
  font-size: 12.5px;
}

.none p {
  margin: 0;
}

.none button {
  padding: 5px 12px;
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text-2);
  font-size: 12.5px;
  transition: color 0.12s, border-color 0.12s;
}

.none button:hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
