<script setup lang="ts">
/**
 * 请求体
 *
 * 五种类型：无 / JSON / 表单（multipart，可传文件）/ urlencoded / 纯文本。
 * JSON 还能在「源码」和「键值表」之间切换——写文档时用键值表，贴一段结构复杂的用源码。
 */
import { computed, ref } from 'vue'
import type { ApiRequest, BodyType } from '../types'
import type { VariableHint } from '../store/workspace'
import { createFormRow } from '../store/workspace'
import { objectToRows, rowsToObject } from '../api/body'
import CodeEditor from './CodeEditor.vue'
import FormEditor from './FormEditor.vue'
import KeyValueEditor from './KeyValueEditor.vue'

const props = defineProps<{ request: ApiRequest; variables: VariableHint[] }>()

const TYPES: { value: BodyType; label: string; hint: string }[] = [
  { value: 'none', label: '无', hint: '不带请求体' },
  { value: 'json', label: 'JSON', hint: 'application/json' },
  { value: 'form', label: '表单', hint: 'multipart/form-data，可以传文件' },
  { value: 'urlencoded', label: 'urlencoded', hint: 'application/x-www-form-urlencoded' },
  { value: 'text', label: '纯文本', hint: 'text/plain' },
]

/** 切换模式失败时的提示（比如 JSON 不是对象） */
const hint = ref('')

function warn(message: string) {
  hint.value = message
  setTimeout(() => (hint.value = ''), 4000)
}

/** 在「源码 / 键值」之间切换，顺手把内容搬过去，不让人重新填 */
function setMode(mode: 'raw' | 'rows') {
  const request = props.request
  if (mode === request.bodyMode) return

  if (mode === 'rows') {
    const text = request.body.trim()
    if (text) {
      try {
        const data = JSON.parse(text)
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          warn('这段 JSON 不是对象（数组或普通值），键值表放不下，先保留源码')
          return
        }
        const rows = objectToRows(data as Record<string, unknown>).map((row) => ({
          ...createFormRow(),
          ...row,
        }))
        if (rows.length) request.rows = rows
      } catch {
        warn('JSON 格式有误，修好之后再切键值表')
        return
      }
    }
  } else {
    // 从键值表回源码：重新生成一份格式化的 JSON
    request.body = JSON.stringify(rowsToObject(request.rows), null, 2)
  }

  request.bodyMode = mode
}

/** 一键格式化，格式不对只提示不弹窗 */
function beautify() {
  try {
    props.request.body = JSON.stringify(JSON.parse(props.request.body), null, 2)
  } catch {
    warn('JSON 格式有误')
  }
}

const typeHint = () => TYPES.find((item) => item.value === props.request.bodyType)?.hint ?? ''

/** GET / HEAD 按规范可以不带请求体，浏览器也会直接报错，提前说明一下 */
const bodyBlocked = computed(() => {
  const method = props.request.method.toUpperCase()
  return (method === 'GET' || method === 'HEAD') && props.request.bodyType !== 'none'
})
</script>

<template>
  <div class="body">
    <div class="toolbar">
      <div class="types">
        <button
          v-for="item in TYPES"
          :key="item.value"
          class="type"
          :class="{ on: request.bodyType === item.value }"
          :title="item.hint"
          @click="request.bodyType = item.value"
        >
          {{ item.label }}
        </button>
      </div>

      <div class="right">
        <span class="type-hint">{{ typeHint() }}</span>

        <div v-if="request.bodyType === 'json'" class="mode">
          <button :class="{ on: request.bodyMode === 'raw' }" @click="setMode('raw')">源码</button>
          <button :class="{ on: request.bodyMode === 'rows' }" @click="setMode('rows')">键值</button>
        </div>

        <button
          v-if="request.bodyType === 'json' && request.bodyMode === 'raw'"
          class="action"
          @click="beautify"
        >
          格式化
        </button>
      </div>
    </div>

    <p v-if="hint" class="hint">{{ hint }}</p>
    <p v-if="bodyBlocked" class="hint">
      {{ request.method }} 请求不会带请求体（浏览器和多数服务端都不接受），改成 POST 就会带上。
    </p>

    <!-- 无 -->
    <p v-if="request.bodyType === 'none'" class="none">这个请求没有请求体</p>

    <!-- JSON -->
    <template v-else-if="request.bodyType === 'json'">
      <KeyValueEditor
        v-if="request.bodyMode === 'rows'"
        :rows="request.rows"
        :variables="variables"
        with-desc
        key-placeholder="字段名"
        value-placeholder="字段值（自动识别数字 / 布尔 / 对象）"
      />
      <CodeEditor
        v-else
        v-model="request.body"
        language="json"
        placeholder="{&#10;  &quot;name&quot;: &quot;apix&quot;&#10;}"
      />
    </template>

    <!-- 表单（multipart） -->
    <FormEditor v-else-if="request.bodyType === 'form'" :rows="request.rows" />

    <!-- urlencoded -->
    <KeyValueEditor
      v-else-if="request.bodyType === 'urlencoded'"
      :rows="request.rows"
      :variables="variables"
      with-desc
      key-placeholder="字段名"
      value-placeholder="字段值"
    />

    <!-- 纯文本 -->
    <CodeEditor v-else v-model="request.body" language="text" placeholder="请求体内容…" />
  </div>
</template>

<style scoped>
.body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.types {
  display: flex;
  gap: 4px;
}

.type {
  height: 28px;
  padding: 0 10px;
  border-radius: var(--radius-sm);
  color: var(--text-3);
  font-size: var(--font-sm);
  transition: color 0.14s, background 0.14s;
}

.type:hover {
  color: var(--text);
}

.type.on {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 500;
}

.right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.type-hint {
  color: var(--text-3);
  font-family: var(--mono);
  font-size: var(--font-xs);
}

.mode {
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: 7px;
  background: var(--neutral-soft);
}

.mode button {
  height: 24px;
  padding: 0 10px;
  border-radius: 6px;
  color: var(--text-2);
  font-size: var(--font-xs);
  transition: background 0.14s, color 0.14s, box-shadow 0.14s;
}

.mode button.on {
  background: var(--surface-solid);
  box-shadow: var(--shadow-1);
  color: var(--text);
}

.action {
  color: var(--accent);
  font-size: var(--font-sm);
}

.action:hover {
  text-decoration: underline;
}

.hint {
  margin: 0;
  color: var(--amber);
  font-size: var(--font-xs);
}

.none {
  margin: 20px 0;
  color: var(--text-3);
  font-size: var(--font-sm);
  text-align: center;
}
</style>
