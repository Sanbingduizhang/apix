/**
 * 全局数据类型
 *
 * 结构保持两层：项目 -> (目录 / 接口)。
 * 目录用 parentId 指向父目录，可以无限嵌套；接口用 folderId 归到某个目录（null 表示放在根上）。
 */

/** 通用的一行 key-value（请求头、表单、变量都用它） */
export interface KeyValueRow {
  id: string
  key: string
  value: string
  enabled: boolean
}

/** 请求体类型 */
export type BodyType = 'none' | 'json' | 'form' | 'text'

/** 表单里的一行：可能是普通文本，也可能是一个文件 */
export interface FormRow extends KeyValueRow {
  type: 'text' | 'file'
  /** 只记录文件名/大小给界面看，真正的字节放在内存缓存里（见 store/fileCache.ts） */
  fileName?: string
  fileSize?: number
  fileType?: string
}

/** 接口分组目录 */
export interface Folder {
  id: string
  name: string
  /** 父目录 id，null 表示在根上 */
  parentId: string | null
}

/** 一套环境，比如开发 / 测试 / 生产 */
export interface Environment {
  id: string
  name: string
  /**
   * 请求前缀（前置 URL），比如 https://api.dev.example.com
   * 接口里的地址只写 /users/1 时，会自动拼在它后面
   */
  baseUrl: string
  /** 环境参数（请求头）：这个环境下的请求都会带上 */
  headers: KeyValueRow[]
  /** 环境变量：被 {{名字}} 引用 */
  vars: KeyValueRow[]
}

/** 一个接口 = 一次可以发送的请求 */
export interface ApiRequest {
  id: string
  name: string
  method: string
  url: string
  headers: KeyValueRow[]
  bodyType: BodyType
  /** json / text 时是原始文本 */
  body: string
  /** 表单（multipart/form-data）时的键值对，值可以是文件 */
  form: FormRow[]
  /** 所属目录，null 表示根目录 */
  folderId: string | null
  updatedAt: number
}

/** 一个项目 */
export interface Project {
  id: string
  name: string
  /** 内置的「即时调试」项目：不可删除、不可改名 */
  scratch?: boolean
  folders: Folder[]
  requests: ApiRequest[]
  environments: Environment[]
  /** 当前选中的环境 */
  activeEnvId: string
  /** 全局参数（请求头）：整个项目的请求都会带上 */
  headers: KeyValueRow[]
  /** 全局变量：所有环境都生效，环境变量优先级更高 */
  vars: KeyValueRow[]
}

/** 持久化的全部数据 */
export interface Workspace {
  projects: Project[]
  activeProjectId: string
  activeRequestId: string
}
