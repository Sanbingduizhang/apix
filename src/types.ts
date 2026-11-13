/**
 * 全局数据类型
 *
 * 只有一个原则：结构尽量扁平、字段尽量少。
 * 现在整个应用的数据就是「项目 -> 接口」两层，全部存在 localStorage 里。
 */

/** 请求头的一行（key-value 表格里的一行） */
export interface HeaderRow {
  id: string
  key: string
  value: string
  enabled: boolean
}

/** 请求体类型，先支持最常见的三种 */
export type BodyType = 'none' | 'json' | 'text'

/** 一个接口 = 一次可以发送的请求 */
export interface ApiRequest {
  id: string
  name: string
  method: string
  url: string
  headers: HeaderRow[]
  bodyType: BodyType
  body: string
  updatedAt: number
}

/** 一个项目（类似 Apifox 的项目 / 团队空间） */
export interface Project {
  id: string
  name: string
  /** 内置的「即时调试」项目：不能删除、不能改名，永远排第一个 */
  scratch?: boolean
  requests: ApiRequest[]
}

/** 存在 localStorage 里的全部数据 */
export interface Workspace {
  projects: Project[]
  activeProjectId: string
  activeRequestId: string
}
