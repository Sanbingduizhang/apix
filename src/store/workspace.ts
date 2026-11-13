/**
 * 本地数据层
 *
 * 整个应用的状态就是 store 这一个响应式对象，任何修改都会被自动写回 localStorage，
 * 所以没有"保存"按钮，改完即存。
 *
 * 以后如果要换成 SQLite（数据量大、需要搜索时再换），只要改动本文件的 load / save 两个函数，
 * 上层组件完全不用动。
 */

import { computed, reactive, watch } from 'vue'
import type { ApiRequest, HeaderRow, Project, Workspace } from '../types'

const STORAGE_KEY = 'apix.workspace.v1'

/** 内置「即时调试」项目的固定 id */
export const SCRATCH_ID = 'scratch'

/** 生成一个短 id，本地用够了，不需要引入 uuid 库 */
function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

/** 新建一个空的请求头行（表格里点"添加一行"用的也是它） */
export function createHeaderRow(): HeaderRow {
  return { id: uid('hdr'), key: '', value: '', enabled: true }
}

/** 新建一个空接口 */
export function createRequest(name = '未命名请求'): ApiRequest {
  return {
    id: uid('req'),
    name,
    method: 'GET',
    url: '',
    // 默认给一行空请求头：表格有个形态，看起来不像"没做完"
    headers: [createHeaderRow()],
    bodyType: 'none',
    body: '',
    updatedAt: Date.now(),
  }
}

/** 内置的「即时调试」项目：打开就能发请求，不用先建项目 */
function createScratchProject(): Project {
  const first = createRequest('示例请求')
  // 预填一个公开的测试接口，保证首次打开不是一片空白
  first.url = 'https://jsonplaceholder.typicode.com/todos/1'
  return { id: SCRATCH_ID, name: '即时调试', scratch: true, requests: [first] }
}

/** 第一次打开时的初始数据 */
function createDefaultWorkspace(): Workspace {
  const scratch = createScratchProject()
  return {
    projects: [scratch],
    activeProjectId: scratch.id,
    activeRequestId: scratch.requests[0].id,
  }
}

/** 从 localStorage 读取；读不到或者格式不对，就返回初始数据 */
function loadWorkspace(): Workspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultWorkspace()

    const data = JSON.parse(raw) as Workspace
    if (!Array.isArray(data.projects) || !data.projects.length) return createDefaultWorkspace()

    // 保证「即时调试」一定存在，且永远在第一个
    const scratch = data.projects.find((p) => p.scratch) ?? createScratchProject()
    const others = data.projects.filter((p) => !p.scratch)
    data.projects = [scratch, ...others]

    // 修正可能失效的选中项（比如手动改过存储）
    if (!data.projects.some((p) => p.id === data.activeProjectId)) {
      data.activeProjectId = scratch.id
    }
    const project = data.projects.find((p) => p.id === data.activeProjectId)!
    if (!project.requests.some((r) => r.id === data.activeRequestId)) {
      data.activeRequestId = project.requests[0]?.id ?? ''
    }
    return data
  } catch {
    return createDefaultWorkspace()
  }
}

export const store = reactive<Workspace>(loadWorkspace())

/** 写回 localStorage。用 250ms 防抖，避免边打字边写盘 */
let saveTimer: ReturnType<typeof setTimeout> | undefined
function saveWorkspace() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  }, 250)
}

watch(store, saveWorkspace, { deep: true })

// ---------- 下面是对外的"读写接口"，组件里只调用这些函数 ----------

/** 当前项目 */
export const activeProject = computed<Project>(() => {
  return store.projects.find((p) => p.id === store.activeProjectId) ?? store.projects[0]
})

/** 当前接口，可能为 null（项目里一个接口都没有时） */
export const activeRequest = computed<ApiRequest | null>(() => {
  return activeProject.value?.requests.find((r) => r.id === store.activeRequestId) ?? null
})

/** 切换项目，并自动选中它的第一个接口 */
export function selectProject(projectId: string) {
  store.activeProjectId = projectId
  const project = store.projects.find((p) => p.id === projectId)
  store.activeRequestId = project?.requests[0]?.id ?? ''
}

/** 新建项目并切过去 */
export function addProject(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  const project: Project = { id: uid('prj'), name: trimmed, requests: [] }
  // 插在「即时调试」后面，保持内置项目始终在最前
  store.projects.splice(1, 0, project)
  selectProject(project.id)
}

/** 删除项目（内置项目不可删） */
export function removeProject(projectId: string) {
  const index = store.projects.findIndex((p) => p.id === projectId)
  if (index < 0 || store.projects[index].scratch) return
  store.projects.splice(index, 1)
  if (store.activeProjectId === projectId) selectProject(store.projects[0].id)
}

/** 在当前项目里新建接口，并选中 */
export function addRequest(): ApiRequest {
  const request = createRequest()
  activeProject.value.requests.unshift(request)
  store.activeRequestId = request.id
  return request
}

/** 删除接口 */
export function removeRequest(requestId: string) {
  const project = activeProject.value
  const index = project.requests.findIndex((r) => r.id === requestId)
  if (index < 0) return
  project.requests.splice(index, 1)
  if (store.activeRequestId === requestId) {
    store.activeRequestId = project.requests[0]?.id ?? ''
  }
}

/** 选中接口 */
export function selectRequest(requestId: string) {
  store.activeRequestId = requestId
}
