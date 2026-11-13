import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * 本地请求代理（只在浏览器开发模式下生效）
 *
 * 为什么需要它：浏览器出于安全策略，不允许网页随便请求别的域名（CORS），
 * 也不允许修改 User-Agent、Cookie 之类的请求头。
 * 所以开发时，前端把「要发的请求」交给 dev server 的 Node 进程去发，再把结果原样返回。
 *
 * 打包成桌面端后，请求由 Rust 侧（src-tauri/src/main.rs）负责，这段代码就不再被用到。
 */
function localProxyPlugin(): Plugin {
  return {
    name: 'apix-local-proxy',
    configureServer(server) {
      server.middlewares.use('/__proxy', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }

        // 1. 读出前端传来的请求描述
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)

        res.setHeader('Content-Type', 'application/json; charset=utf-8')

        try {
          const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))

          // 2. 组装请求头，只保留启用的
          const headers: Record<string, string> = {}
          for (const h of payload.headers ?? []) {
            if (h.enabled && String(h.key).trim()) headers[String(h.key).trim()] = h.value
          }

          // 3. 组装请求体：表单要拼成 FormData，文件从 base64 还原
          let requestBody: BodyInit | undefined
          if (Array.isArray(payload.formFields)) {
            const form = new FormData()
            for (const field of payload.formFields) {
              if (field.type === 'file' && field.fileBase64) {
                const bytes = Buffer.from(field.fileBase64, 'base64')
                const blob = new Blob([bytes], {
                  type: field.fileType || 'application/octet-stream',
                })
                form.append(field.key, blob, field.fileName || 'file')
              } else if (field.type === 'text') {
                form.append(field.key, field.value ?? '')
              }
            }
            requestBody = form
            // multipart 的 boundary 必须由 fetch 自己生成，手写 Content-Type 会让它失效
            for (const key of Object.keys(headers)) {
              if (key.toLowerCase() === 'content-type') delete headers[key]
            }
          } else if (payload.body) {
            requestBody = payload.body
          }

          // 4. 真正发请求，并记录耗时
          const started = Date.now()
          const response = await fetch(payload.url, {
            method: payload.method,
            headers,
            body: requestBody,
          })
          const body = await response.text()

          res.end(
            JSON.stringify({
              status: response.status,
              statusText: response.statusText,
              durationMs: Date.now() - started,
              size: Buffer.byteLength(body),
              headers: [...response.headers.entries()],
              body,
            }),
          )
        } catch (error: any) {
          // 网络错误、地址写错等：照样返回 200，让前端把错误显示在响应面板里
          res.end(
            JSON.stringify({
              status: 0,
              statusText: '',
              durationMs: 0,
              size: 0,
              headers: [],
              body: '',
              error: error?.message ?? String(error),
            }),
          )
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), localProxyPlugin()],
  server: { port: 5173, strictPort: true },
  clearScreen: false,
})
