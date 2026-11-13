/**
 * 请求体的小工具：键值表 和 JSON 对象之间的来回转换
 *
 * 放在这里是因为两处都要用：编辑区要在「源码 / 键值」之间切换，
 * 发送时也要把键值表拼成真正的 JSON。
 */

import type { FormRow } from '../types'

/**
 * 把输入框里的字符串还原成它看起来的类型。
 * 这样在键值表里写 123 得到的是数字、true 得到布尔、{"a":1} 得到对象，
 * 不用再让用户去选"类型"，日常够用。
 */
export function parseLooseValue(text: string): unknown {
  const value = text.trim()
  if (value === '') return ''
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value)
  if (/^[[{]/.test(value)) {
    try {
      return JSON.parse(value)
    } catch {
      return text
    }
  }
  return text
}

/** 反向：把任意值写成一行能编辑的文本 */
export function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** 键值表 -> 对象（跳过没勾选和没填键名的行） */
export function rowsToObject(rows: FormRow[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const row of rows) {
    const key = row.key.trim()
    if (!row.enabled || !key) continue
    result[key] = row.type === 'file' ? '' : parseLooseValue(row.value)
  }
  return result
}

/** 对象 -> 键值表（只处理第一层，嵌套结构建议直接用源码编辑） */
export function objectToRows(data: Record<string, unknown>): { key: string; value: string }[] {
  return Object.entries(data).map(([key, value]) => ({ key, value: stringifyValue(value) }))
}
