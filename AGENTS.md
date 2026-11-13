# AGENTS.md

给 AI 编程助手（Codex、Cursor、Claude Code、Copilot 等）的项目说明。
人和 AI 都按这里的约定来。

## 这是什么

apix 是一个轻量的 HTTP 接口调试工具。Tauri 2 桌面端，无登录、无云同步，数据全在本机。

## 命令

```bash
pnpm install         # 装依赖
pnpm dev             # 浏览器里调界面（:5173，开了 strictPort，不会自动换端口）
pnpm build           # vue-tsc 类型检查 + vite 构建，改完必须过
pnpm tauri dev       # 桌面端，会自己起 vite，别再单独开 pnpm dev
cd src-tauri && cargo check   # 只有动了 Rust 侧才需要
```

## 结构

```
src/types.ts              全部数据结构，改字段先改这里
src/store/workspace.ts    唯一的持久化层（localStorage），增删改查都在这
src/store/draft.ts        编辑副本：界面改草稿，保存才写回 workspace
src/store/{theme,confirm,contextMenu,fileCache}.ts
src/api/http.ts           发送入口：桌面端 invoke Rust，浏览器走 vite 代理
src/api/body.ts           请求体序列化
src/components/           一个组件一件事，没有 UI 库
src/styles.css            全部设计变量 + 主题，组件里不写死颜色
src-tauri/src/main.rs     send_request 命令，reqwest 发请求
```

## 硬性约定

1. **注释全中文**，解释"为什么这么做"而不是"这行做了什么"。看不懂的抽象不要写。
2. **不引 UI 库**。现在的依赖只有 vue + tauri，别为了一个表格或下拉引组件库。
3. **优先零依赖**。CodeEditor（语法高亮）就是 textarea 叠一层高亮 `<pre>`，没上 CodeMirror。
4. **颜色只能来自 CSS 变量**。写死 `#fff` 会在另外六套配色和深色模式下坏掉。
5. **不写无意义的抽象**。这个项目的尺寸不需要 service 层、hook 层、泛型封装。
6. 改完必须 `pnpm build` 通过；动了 Rust 必须 `cargo check` 通过。

## 三个维度，别搞混

主题是三个独立属性，都挂在 `<html>` 上：

- `data-theme` = `light` | `dark`
- `data-palette` = `nature` | `warm` | `tide` | `candy` | `neon` | `clay` | `mono`
- `data-size` = `small` | `medium` | `large`

CSS 里覆盖顺序有讲究，权重相同时靠后的生效：

```
:root                            → 默认配色·浅色
[data-theme='dark']              → 默认配色·深色
[data-palette='xxx']             → 该配色·浅色
[data-palette='xxx'][data-theme='dark'] → 该配色·深色
```

新增一套配色 = 复制一组浅色块 + 深色块，并补一个同色相的 `--neutral-soft`。

## 数据约定

- 存储键 `apix.workspace.v2`，250ms 防抖落盘，没有"保存文件"的概念
- 老数据在 `workspace.ts` 的 `normalize()` 里统一补齐，不要在各个组件里散落判空
- 参数、请求头、Body 都存成 JSON 数组，只有需要排序/搜索的字段才拆成独立列
- 上传的文件**只放内存**（`store/fileCache.ts`），不进 localStorage——配额 5MB 扛不住

## 踩过的坑（别再踩一遍）

- 组件内别用 `.empty` / `.item` 这种大路货类名，已发生过 `.prefix.empty` 撞上 `.empty { margin: 26px 0 }`，被顶飞 26px 再被 `overflow: hidden` 裁掉
- 有 `backdrop-filter` 的元素会自建层叠上下文，里面的下拉浮层压不过后面的面板，得给外层显式 `z-index`
- 浏览器和 Node 的 fetch 都拒绝 GET/HEAD 带请求体，发送前要主动丢掉
- 路径变量只认 `/` 后面的冒号（`/:id`、`/{id}`），否则 `http://host:8080` 的端口会被当成变量
- multipart 的 `Content-Type` 必须由发送方生成（要带 boundary），用户手写的要跳过

## 不要做

- 不要提交 `.workbuddy/`，那是本地会话记忆，已在 `.gitignore` 里
- 不要吞异常。发送失败要把原因显示给用户，别只 `console.error`
- 不要为了"支持更多场景"而改数据结构的形状。加字段可以，改结构要先想好迁移
