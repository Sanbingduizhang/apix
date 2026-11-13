/**
 * 本地数据层
 *
 * 整个应用的状态就是 store 这一个响应式对象，改完自动写回 localStorage，所以没有"保存"按钮。
 * 上层组件只调用本文件导出的函数，不直接操作 localStorage。
 *
 * 以后换成后端同步时，只需要把 load / save 换掉，组件不用动。
 */

import { computed, reactive, watch } from 'vue'
import type {
  ApiRequest,
  Environment,
  Folder,
  FormRow,
  KeyValueRow,
  Project,
  Workspace,
} from '../types'

const STORAGE_KEY = 'apix.workspace.v2'
/** 旧版本（没有目录和环境）的数据，读到就顺手迁过来 */
const LEGACY_KEY = 'apix.workspace.v1'

/** 内置「即时调试」项目的固定 id */
export const SCRATCH_ID = 'scratch'

/** 生成短 id，本地够用，不引第三方库 */
function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

/** 一行空的 key-value（请求头、变量用） */
export function createKeyValueRow(): KeyValueRow {
  return { id: uid('kv'), key: '', value: '', enabled: true }
}

/** 一行空表单字段，默认是文本，点了"文件"就变成上传 */
export function createFormRow(): FormRow {
  return { id: uid('kv'), key: '', value: '', enabled: true, type: 'text' }
}

/** 新建一套环境，默认各给一行空行，方便直接编辑 */
export function createEnvironment(name: string, baseUrl = ''): Environment {
  return {
    id: uid('env'),
    name,
    baseUrl,
    headers: [createKeyValueRow()],
    vars: [createKeyValueRow()],
  }
}

/** 新建一个空接口 */
export function createRequest(folderId: string | null = null, name = '未命名请求'): ApiRequest {
  return {
    id: uid('req'),
    name,
    method: 'GET',
    url: '',
    headers: [createKeyValueRow()],
    bodyType: 'none',
    body: '',
    form: [createFormRow()],
    folderId,
    updatedAt: Date.now(),
  }
}

/** 新建项目：默认带开发 / 测试 / 生产三套环境 */
export function createProject(name: string): Project {
  const environments = [createEnvironment('开发'), createEnvironment('测试'), createEnvironment('生产')]
  return {
    id: uid('prj'),
    name,
    folders: [],
    requests: [],
    environments,
    activeEnvId: environments[0].id,
    headers: [createKeyValueRow()],
    vars: [createKeyValueRow()],
  }
}

/** 内置的「即时调试」项目：打开就能发请求 */
function createScratchProject(): Project {
  const project = createProject('即时调试')
  project.id = SCRATCH_ID
  project.scratch = true
  const example = createRequest(null, '示例请求')
  example.url = 'https://jsonplaceholder.typicode.com/todos/1'
  project.requests = [example]
  return project
}

function createDefaultWorkspace(): Workspace {
  const scratch = createScratchProject()
  return {
    projects: [scratch],
    activeProjectId: scratch.id,
    activeRequestId: scratch.requests[0].id,
  }
}

/**
 * 把数据结构补齐成当前版本的样子：
 * 老数据 / 手改过的数据可能缺字段，这里一次性兜住，后面就不用到处写判空。
 */
function normalize(data: Workspace): Workspace {
  if (!Array.isArray(data.projects) || !data.projects.length) return createDefaultWorkspace()

  for (const project of data.projects) {
    project.folders ??= []
    project.requests ??= []
    project.headers ??= [createKeyValueRow()]
    project.vars ??= [createKeyValueRow()]
    project.environments ??= []
    if (!project.environments.length) project.environments = [createEnvironment('开发')]
    if (!project.environments.some((env) => env.id === project.activeEnvId)) {
      project.activeEnvId = project.environments[0].id
    }
    for (const env of project.environments) {
      env.baseUrl ??= ''
      env.headers ??= [createKeyValueRow()]
      env.vars ??= [createKeyValueRow()]
    }
    for (const request of project.requests) {
      request.headers ??= [createKeyValueRow()]
      request.form ??= [createFormRow()]
      request.folderId ??= null
      // 老版本的表单行没有 type 字段，补成文本
      for (const row of request.form) row.type ??= 'text'
    }
  }

  /**
   * 修复 id 重复。
   *
   * 老版本（v1）迁移过来时，项目 id 保留了下来但 scratch 标记丢了，于是会出现
   * 两个 id 都叫 scratch 的项目：一个是新建的「即时调试」，一个是迁移过来的旧项目。
   * 结果就是删第二个没反应（按 id 找到的永远是下标 0 那个受保护的），
   * v-for 的 key 也是重复的。这里一次性修干净。
   */
  const seenIds = new Set<string>()
  for (const project of data.projects) {
    if (seenIds.has(project.id) || !project.id) project.id = uid('prj')
    seenIds.add(project.id)
  }

  // 「即时调试」必须存在且唯一：先认 scratch 标记，再认固定 id
  let scratch = data.projects.find((p) => p.scratch) ?? data.projects.find((p) => p.id === SCRATCH_ID)
  if (scratch) {
    scratch.id = SCRATCH_ID
    scratch.scratch = true
  } else {
    scratch = createScratchProject()
  }

  // 其它项目一律不许带 scratch 标记，也不许占用固定 id，否则会"删不掉"
  const others = data.projects.filter((p) => p !== scratch)
  const usedIds = new Set([SCRATCH_ID])
  for (const project of others) {
    delete project.scratch
    if (usedIds.has(project.id)) project.id = uid('prj')
    usedIds.add(project.id)
    // 接口 id 也可能撞车，顺手一起修
    const requestIds = new Set<string>()
    for (const request of project.requests) {
      if (requestIds.has(request.id)) request.id = uid('req')
      requestIds.add(request.id)
    }
  }
  data.projects = [scratch, ...others]

  if (!data.projects.some((p) => p.id === data.activeProjectId)) {
    data.activeProjectId = scratch.id
  }
  const active = data.projects.find((p) => p.id === data.activeProjectId)!
  if (!active.requests.some((r) => r.id === data.activeRequestId)) {
    data.activeRequestId = active.requests[0]?.id ?? ''
  }
  return data
}

/** 把 v1（只有项目和接口）迁移成 v2（增加目录、环境、变量） */
function migrateLegacy(raw: string): Workspace | null {
  try {
    const old = JSON.parse(raw) as { projects?: any[]; activeRequestId?: string }
    const projects: Project[] = (old.projects ?? []).map((item) => {
      const project = createProject(item.name ?? '未命名项目')
      project.id = item.id ?? project.id
      project.requests = (item.requests ?? []).map((request: any) => ({
        ...createRequest(null, request.name ?? '未命名请求'),
        id: request.id ?? uid('req'),
        method: request.method ?? 'GET',
        url: request.url ?? '',
        headers: request.headers?.length ? request.headers : [createKeyValueRow()],
        bodyType: request.bodyType ?? 'none',
        body: request.body ?? '',
      }))
      return project
    })
    return normalize({
      projects,
      activeProjectId: projects[0]?.id ?? '',
      activeRequestId: old.activeRequestId ?? '',
    })
  } catch {
    return null
  }
}

function loadWorkspace(): Workspace {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      return normalize(JSON.parse(raw) as Workspace)
    } catch {
      return createDefaultWorkspace()
    }
  }
  const legacy = localStorage.getItem(LEGACY_KEY)
  return (legacy && migrateLegacy(legacy)) || createDefaultWorkspace()
}

export const store = reactive<Workspace>(loadWorkspace())

/**
 * 启动时先落一次盘。
 * loadWorkspace 会顺手修数据（补字段、修重复 id），不马上写回去的话，
 * 磁盘上一直是旧的样子，每次打开都要再修一遍。
 */
try {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
} catch {
  // 隐私模式下 localStorage 可能不可写，忽略即可，不影响使用
}

/** 写回 localStorage，250ms 防抖，避免边打字边写盘 */
let saveTimer: ReturnType<typeof setTimeout> | undefined
watch(
  store,
  () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(store)), 250)
  },
  { deep: true },
)

// ---------------- 当前项目 / 接口 / 环境 ----------------

export const activeProject = computed<Project | undefined>(() =>
  store.projects.find((p) => p.id === store.activeProjectId),
)

export const activeRequest = computed<ApiRequest | null>(
  () => activeProject.value?.requests.find((r) => r.id === store.activeRequestId) ?? null,
)

export const currentEnvironment = computed<Environment | undefined>(() =>
  activeProject.value?.environments.find((e) => e.id === activeProject.value!.activeEnvId),
)

/** 当前环境的请求前缀，没配就是空字符串 */
export const activeBaseUrl = computed(() => currentEnvironment.value?.baseUrl?.trim() ?? '')

// ---------------- 项目 ----------------

/** 进入项目：默认选中根目录下的第一个接口 */
export function openProject(projectId: string) {
  store.activeProjectId = projectId
  const project = store.projects.find((p) => p.id === projectId)
  const first = project?.requests.find((r) => !r.folderId) ?? project?.requests[0]
  store.activeRequestId = first?.id ?? ''
}

export function addProject(name: string): Project | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  const project = createProject(trimmed)
  store.projects.push(project)
  return project
}

export function renameProject(projectId: string, name: string) {
  const project = store.projects.find((p) => p.id === projectId)
  if (project && !project.scratch && name.trim()) project.name = name.trim()
}

/**
 * 删除项目。
 * 传对象而不是 id：万一手改的数据里出现同 id 的项目，按 id 删会删错甚至删不动，
 * 按对象引用删就永远是对的那一个。
 */
export function removeProject(target: Project) {
  if (!target || target.scratch || target.id === SCRATCH_ID) return
  store.projects = store.projects.filter((p) => p !== target)
  if (store.activeProjectId === target.id) {
    store.activeProjectId = store.projects[0].id
    store.activeRequestId = store.projects[0].requests[0]?.id ?? ''
  }
}

// ---------------- 目录 ----------------

export function addFolder(parentId: string | null = null): Folder | null {
  const project = activeProject.value
  if (!project) return null
  const folder: Folder = { id: uid('fld'), name: '新建目录', parentId }
  project.folders.push(folder)
  return folder
}

export function renameFolder(folderId: string, name: string) {
  const folder = activeProject.value?.folders.find((f) => f.id === folderId)
  if (folder && name.trim()) folder.name = name.trim()
}

/** 收集某个目录及其全部子目录的 id */
function collectFolderIds(project: Project, rootId: string): string[] {
  const ids = [rootId]
  for (let i = 0; i < ids.length; i++) {
    for (const folder of project.folders) {
      if (folder.parentId === ids[i]) ids.push(folder.id)
    }
  }
  return ids
}

/** 删除目录：里面的子目录和接口一起删掉 */
export function removeFolder(folderId: string) {
  const project = activeProject.value
  if (!project) return
  const ids = collectFolderIds(project, folderId)
  project.folders = project.folders.filter((f) => !ids.includes(f.id))
  const removed = project.requests.filter((r) => r.folderId && ids.includes(r.folderId))
  project.requests = project.requests.filter((r) => !removed.some((x) => x.id === r.id))
  if (removed.some((r) => r.id === store.activeRequestId)) {
    store.activeRequestId = project.requests[0]?.id ?? ''
  }
}

/** 某个目录下的接口数量（含子目录） */
export function countRequestsInFolder(folderId: string): number {
  const project = activeProject.value
  if (!project) return 0
  const ids = collectFolderIds(project, folderId)
  return project.requests.filter((r) => r.folderId && ids.includes(r.folderId)).length
}

// ---------------- 接口 ----------------

export function addRequest(folderId: string | null = null): ApiRequest | null {
  const project = activeProject.value
  if (!project) return null
  const request = createRequest(folderId)
  project.requests.unshift(request)
  store.activeRequestId = request.id
  return request
}

export function removeRequest(requestId: string) {
  const project = activeProject.value
  if (!project) return
  project.requests = project.requests.filter((r) => r.id !== requestId)
  if (store.activeRequestId === requestId) {
    store.activeRequestId = project.requests[0]?.id ?? ''
  }
}

export function renameRequest(requestId: string, name: string) {
  const request = activeProject.value?.requests.find((r) => r.id === requestId)
  if (request && name.trim()) request.name = name.trim()
}

export function selectRequest(requestId: string) {
  store.activeRequestId = requestId
}

// ---------------- 环境与变量 ----------------

export function setActiveEnvironment(envId: string) {
  if (activeProject.value) activeProject.value.activeEnvId = envId
}

export function addEnvironment(name: string): Environment | null {
  const project = activeProject.value
  if (!project) return null
  const env = createEnvironment(name)
  project.environments.push(env)
  return env
}

export function renameEnvironment(envId: string, name: string) {
  const env = activeProject.value?.environments.find((e) => e.id === envId)
  if (env && name.trim()) env.name = name.trim()
}

export function removeEnvironment(envId: string) {
  const project = activeProject.value
  if (!project || project.environments.length <= 1) return
  project.environments = project.environments.filter((e) => e.id !== envId)
  if (project.activeEnvId === envId) project.activeEnvId = project.environments[0].id
}

/**
 * 把文本里的 {{变量名}} 替换成真实值。
 * 优先级：环境变量 > 全局变量；找不到就原样保留，方便肉眼看出哪个变量没配。
 */
export function resolveVariables(text: string): string {
  const project = activeProject.value
  if (!project || !text) return text

  const values = new Map<string, string>()
  for (const row of project.vars) {
    if (row.enabled && row.key.trim()) values.set(row.key.trim(), row.value)
  }
  const env = project.environments.find((e) => e.id === project.activeEnvId)
  for (const row of env?.vars ?? []) {
    if (row.enabled && row.key.trim()) values.set(row.key.trim(), row.value)
  }

  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (matched, name: string) => values.get(name) ?? matched)
}

/** 一个请求最终会带上的请求头，以及它来自哪一层 */
export interface EffectiveHeader {
  key: string
  value: string
  source: '全局' | '环境' | '请求'
}/**
 * 合并三层请求头：全局参数 -> 环境参数 -> 请求自己的。
 * 同名的后面的覆盖前面的，所以优先级是 请求 > 环境 > 全局。
 */
export function effectiveHeaders(request: ApiRequest): EffectiveHeader[] {
  const project = activeProject.value
  if (!project) return []

  const map = new Map<string, EffectiveHeader>()
  const add = (rows: KeyValueRow[], source: EffectiveHeader['source']) => {
    for (const row of rows) {
      const key = row.key.trim()
      if (!row.enabled || !key) continue
      // 用全小写做键，避免 Content-Type 和 content-type 被当成两个头
      map.set(key.toLowerCase(), { key, value: row.value, source })
    }
  }

  add(project.headers, '全局')
  const env = project.environments.find((item) => item.id === project.activeEnvId)
  if (env) add(env.headers, '环境')
  add(request.headers, '请求')

  return [...map.values()]
}

/** 当前可用的变量（用来在输入时给候选提示） */
export interface VariableHint {
  key: string
  value: string
  source: '全局' | '环境'
}

export function availableVariables(): VariableHint[] {
  const project = activeProject.value
  if (!project) return []

  const hints: VariableHint[] = []
  for (const row of project.vars) {
    if (row.enabled && row.key.trim()) {
      hints.push({ key: row.key.trim(), value: row.value, source: '全局' })
    }
  }
  const env = project.environments.find((item) => item.id === project.activeEnvId)
  for (const row of env?.vars ?? []) {
    if (row.enabled && row.key.trim()) {
      hints.push({ key: row.key.trim(), value: row.value, source: '环境' })
    }
  }
  return hints
}

// ---------------- 地址拼接 ----------------

/** 是不是一条完整地址（自带协议） */
export function isAbsoluteUrl(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url.trim())
}

/**
 * 把接口里填的地址拼成真正要请求的地址：
 *   1. 先把 {{变量}} 换成真实值
 *   2. 自带协议（http:// 之类）就原样用，方便临时贴一条完整地址来调
 *   3. 否则拼上当前环境的请求前缀，两边的斜杠多退少补
 */
export function resolveUrl(raw: string): string {
  const url = resolveVariables(raw.trim())
  if (!url) return ''
  if (isAbsoluteUrl(url)) return url

  const base = resolveVariables(activeBaseUrl.value).trim()
  if (!base) return url
  return `${base.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
}
