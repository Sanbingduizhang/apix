/**
 * 全局数据类型
 *
 * 结构保持两层：项目 -> (目录 / 接口)。
 * 目录用 parentId 指向父目录，可以无限嵌套；接口用 folderId 归到某个目录（null 表示放在根上）。
 */

/** 通用的一行 key-value（查询参数、请求头、变量、路径变量都用它） */
export interface KeyValueRow {
  id: string
  key: string
  value: string
  enabled: boolean
  /** 说明文字，界面上是可选的"描述"列 */
  desc?: string
}

/**
 * 请求体类型
 *   none       没有请求体
 *   json       application/json
 *   form       multipart/form-data（可以带文件）
 *   urlencoded application/x-www-form-urlencoded
 *   text       text/plain
 */
export type BodyType = 'none' | 'json' | 'form' | 'urlencoded' | 'text'

/** JSON 的编辑方式：直接写源码，或者用键值表 */
export type BodyMode = 'raw' | 'rows'

/** 请求体里的一行：可能是普通文本，也可能是一个文件 */
export interface FormRow extends KeyValueRow {
  type: 'text' | 'file'
  /** 只记录文件名/大小给界面看，真正的字节放在内存缓存里（见 store/fileCache.ts） */
  fileName?: string
  fileSize?: number
  fileType?: string
}

/** 鉴权方式，够日常用就行 */
export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey'

export interface AuthConfig {
  type: AuthType
  /** Bearer 的 token */
  token: string
  /** Basic 的用户名密码 */
  username: string
  password: string
  /** API Key 的键名与值，以及放在请求头还是查询参数里 */
  key: string
  value: string
  position: 'header' | 'query'
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

/** 一个接口 = 一份接口定义 + 一次可以发送的请求 */
export interface ApiRequest {
  id: string
  name: string
  /** 接口说明，写给人看的 */
  desc: string
  method: string
  /** 地址，可以是完整地址，也可以只写路径（走环境前缀） */
  url: string
  /** 查询参数，发送时拼到地址后面 */
  params: KeyValueRow[]
  /** 路径变量，键来自地址里的 :name，发送时替换 */
  pathParams: KeyValueRow[]
  /** 鉴权，发送时自动生成对应的请求头或参数 */
  auth: AuthConfig
  headers: KeyValueRow[]
  bodyType: BodyType
  /** 只有 json 用得上：源码 / 键值表 */
  bodyMode: BodyMode
  /** json / text 的原始文本 */
  body: string
  /** json 键值模式、form、urlencoded 共用的行 */
  rows: FormRow[]
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
