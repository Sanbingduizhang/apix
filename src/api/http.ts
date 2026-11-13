/**
 * 发送 HTTP 请求
 *
 * 这里有两条路，对上层组件是透明的：
 *   1. 桌面端（Tauri）：调用 Rust 的 send_request 命令，用 reqwest 真正发请求。
 *   2. 浏览器里跑（开发预览）：请求转给 Vite 的本地代理 /__proxy。
 *
 * 为什么浏览器不能直接 fetch：浏览器的同源策略（CORS）会拦掉大部分跨域请求，
 * 而且不允许改 User-Agent、Cookie 这类受限请求头，做调试工具是不够用的。
 */

import { invoke } from '@tauri-apps/api/core'
import type { HeaderRow } from '../types'

/** 发给后端的请求描述 */
export interface SendPayload {
  method: string
  url: string
  headers: HeaderRow[]
  body: string | null
}

/** 统一的响应结构，桌面端和浏览器端返回的字段完全一致 */
export interface SendResult {
  status: number
  statusText: string
  durationMs: number
  size: number
  headers: [string, string][]
  body: string
  /** 只有网络层出错（域名解析失败、超时等）时才有值 */
  error?: string
}

/** 判断是否运行在 Tauri 桌面端里 */
function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function sendHttpRequest(payload: SendPayload): Promise<SendResult> {
  if (isDesktop()) {
    return invoke<SendResult>('send_request', { payload })
  }

  const response = await fetch('/__proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return (await response.json()) as SendResult
}
