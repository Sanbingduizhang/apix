/**
 * 已选文件的内存缓存
 *
 * 为什么放内存而不是存进 localStorage：
 *   1. localStorage 一般只有 5MB，塞不下几个文件；
 *   2. 存进去也会把整个数据包撑得很大，每次改动都要序列化一遍。
 *
 * 代价是刷新页面后要重新选文件，界面上会显示"需重新选择"提示。
 * 等以后接了后端/本地数据库，再换成按路径读取。
 */

export interface CachedFile {
  name: string
  size: number
  type: string
  /** 文件内容的 base64，发送时交给 Rust 或本地代理还原成二进制 */
  base64: string
}

/** key 是表单行的 id */
const cache = new Map<string, CachedFile>()

/** 读文件到内存（用 FileReader 转 base64） */
export function putFile(rowId: string, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      // readAsDataURL 的结果形如 "data:image/png;base64,xxxx"，取逗号后面的部分
      cache.set(rowId, {
        name: file.name,
        size: file.size,
        type: file.type,
        base64: result.slice(result.indexOf(',') + 1),
      })
      resolve()
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function getFile(rowId: string): CachedFile | undefined {
  return cache.get(rowId)
}

export function dropFile(rowId: string) {
  cache.delete(rowId)
}

/** 字节数转成好读的 KB / MB */
export function formatFileSize(bytes = 0): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
