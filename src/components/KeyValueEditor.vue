<script setup lang="ts">
/**
 * key-value 表格（请求头 / 变量 / 环境参数都用它）
 *
 * 两个小贴心：
 *   1. 传了 suggestions 就出现"键名候选"（常用请求头），点输入框弹出
 *   2. 传了 variables，在值里输入 {{ 就会列出可用的变量，选中自动补全
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { KeyValueRow } from '../types'
import type { VariableHint } from '../store/workspace'
import { createKeyValueRow } from '../store/workspace'

const props = withDefaults(
  defineProps<{
    rows: KeyValueRow[]
    /** 键名候选；不传就没有下拉 */
    suggestions?: string[]
    /** 可用变量；传了才支持 {{ 补全 */
    variables?: VariableHint[]
    keyPlaceholder?: string
    valuePlaceholder?: string
    /** 多一列"描述"，接口文档里用得上 */
    withDesc?: boolean
  }>(),
  {
    suggestions: () => [],
    variables: () => [],
    keyPlaceholder: '键名',
    valuePlaceholder: '值',
    withDesc: false,
  },
)

/** 当前正在编辑键名的行，-1 表示没有 */
const focusedKey = ref(-1)
const keyAnchor = ref({ left: 0, top: 0, width: 232, maxHeight: 240 })

/** 变量补全的状态 */
const varQuery = ref<string | null>(null)
const varAnchor = ref({ left: 0, top: 0, width: 260, maxHeight: 220 })
let activeValueInput: HTMLInputElement | null = null
/** 当前正在编辑"值"的那一行 */
const activeValueRow = ref<KeyValueRow | null>(null)

const activeKeyRow = computed<KeyValueRow | null>(() =>
  focusedKey.value >= 0 ? (props.rows[focusedKey.value] ?? null) : null,
)

const keySuggestions = computed(() =>
  activeKeyRow.value ? suggestionsFor(activeKeyRow.value) : [],
)

const varSuggestions = computed(() => {
  if (varQuery.value === null) return []
  const query = varQuery.value.toLowerCase()
  return props.variables
    .filter((item) => item.key.toLowerCase().includes(query))
    .slice(0, 8)
})

function addRow() {
  props.rows.push(createKeyValueRow())
}

function removeRow(index: number) {
  props.rows.splice(index, 1)
  focusedKey.value = -1
  varQuery.value = null
}

/** 候选列表：按输入内容过滤，并且去掉别的行已经用过的键 */
function suggestionsFor(row: KeyValueRow): string[] {
  if (!props.suggestions.length) return []
  const keyword = row.key.trim().toLowerCase()
  const used = new Set(props.rows.filter((r) => r !== row).map((r) => r.key.trim().toLowerCase()))
  return props.suggestions
    .filter((item) => item.toLowerCase().includes(keyword) && !used.has(item.toLowerCase()))
    .slice(0, 8)
}

function onKeyFocus(event: FocusEvent, index: number) {
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  focusedKey.value = index
  keyAnchor.value = {
    left: rect.left,
    top: rect.bottom + 4,
    width: Math.max(232, rect.width),
    maxHeight: Math.max(120, window.innerHeight - rect.bottom - 16),
  }
}

function pickKey(row: KeyValueRow, value: string) {
  row.key = value
  focusedKey.value = -1
}

/** 值输入框获得焦点：记下这一行和这个元素，后面补全要用 */
function onValueFocus(event: FocusEvent, row: KeyValueRow) {
  activeValueInput = event.target as HTMLInputElement
  activeValueRow.value = row
  focusedKey.value = -1
}

/** 值里输入 {{ 时，把光标前的片段当作变量前缀来筛选 */
function onValueInput(event: Event, row: KeyValueRow) {
  const input = event.target as HTMLInputElement
  activeValueInput = input
  activeValueRow.value = row

  const caret = input.selectionStart ?? input.value.length
  const before = input.value.slice(0, caret)
  const match = before.match(/\{\{([\w.-]*)$/)

  if (!match || !props.variables.length) {
    varQuery.value = null
    return
  }

  varQuery.value = match[1]
  const rect = input.getBoundingClientRect()
  varAnchor.value = {
    left: rect.left,
    top: rect.bottom + 4,
    width: Math.max(260, rect.width),
    maxHeight: Math.max(120, window.innerHeight - rect.bottom - 16),
  }
}

/** 把变量名包成 {{名字}}，模板里直接写会被当成插值，所以用函数生成 */
function wrapVar(key: string) {
  return `{{${key}}}`
}

/** 选中变量后，把光标前的 {{xxx 替换成完整的 {{名字}} */
function pickVariable(row: KeyValueRow, name: string) {
  const input = activeValueInput
  if (!input) return

  const caret = input.selectionStart ?? input.value.length
  const before = input.value.slice(0, caret).replace(/\{\{([\w.-]*)$/, `{{${name}}}`)
  const after = input.value.slice(caret)
  row.value = before + after
  varQuery.value = null

  nextTick(() => {
    input.focus()
    input.selectionStart = input.selectionEnd = before.length
  })
}

/** 页面一滚动，浮层位置就不准了，直接收起 */
function onScroll() {
  focusedKey.value = -1
  varQuery.value = null
}

onMounted(() => window.addEventListener('scroll', onScroll, true))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll, true))
</script>

<template>
  <div class="kv">
    <div v-if="rows.length" class="row head" :class="{ 'with-desc': withDesc }">
      <span />
      <span>{{ keyPlaceholder }}</span>
      <span>{{ valuePlaceholder }}</span>
      <span v-if="withDesc">描述</span>
      <span />
    </div>

    <div v-for="(row, index) in rows" :key="row.id" class="row" :class="{ 'with-desc': withDesc }">
      <input v-model="row.enabled" type="checkbox" class="check" />

      <input
        v-model="row.key"
        class="cell mono"
        :placeholder="keyPlaceholder"
        spellcheck="false"
        @focus="onKeyFocus($event, index)"
        @blur="focusedKey = -1"
      />

      <input
        v-model="row.value"
        class="cell mono"
        :placeholder="valuePlaceholder"
        spellcheck="false"
        @focus="onValueFocus($event, row)"
        @input="onValueInput($event, row)"
        @blur="varQuery = null"
      />

      <input
        v-if="withDesc"
        v-model="row.desc"
        class="cell desc"
        placeholder="说明（可选）"
        spellcheck="false"
      />

      <button class="remove" title="删除这一行" @click="removeRow(index)">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M2.5 3.5h7M4.6 3.5V2.2h2.8v1.3M4 3.5l.4 6h3.2l.4-6"
            fill="none"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <button class="add" @click="addRow">+ 添加一行</button>

    <!-- 键名候选 -->
    <Teleport to="body">
      <div
        v-if="keySuggestions.length"
        class="popover"
        :style="{
          left: `${keyAnchor.left}px`,
          top: `${keyAnchor.top}px`,
          width: `${keyAnchor.width}px`,
          maxHeight: `${keyAnchor.maxHeight}px`,
        }"
      >
        <button
          v-for="item in keySuggestions"
          :key="item"
          class="popover-item"
          @mousedown.prevent="activeKeyRow && pickKey(activeKeyRow, item)"
        >
          {{ item }}
        </button>
      </div>
    </Teleport>

    <!-- 变量补全 -->
    <Teleport to="body">
      <div
        v-if="varSuggestions.length"
        class="popover"
        :style="{
          left: `${varAnchor.left}px`,
          top: `${varAnchor.top}px`,
          width: `${varAnchor.width}px`,
          maxHeight: `${varAnchor.maxHeight}px`,
        }"
      >
        <button
          v-for="item in varSuggestions"
          :key="item.key"
          class="popover-item var"
          @mousedown.prevent="activeValueRow && pickVariable(activeValueRow, item.key)"
        >
          <span class="var-key mono">{{ wrapVar(item.key) }}</span>
          <span class="var-value">{{ item.value || '（空）' }}</span>
          <span class="var-source">{{ item.source }}</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.kv {
  display: flex;
  flex-direction: column;
}

.row {
  display: grid;
  grid-template-columns: 16px 1fr 1.5fr 24px;
  align-items: center;
  gap: 10px;
  height: var(--h-row);
  padding: 0 4px;
  border-radius: var(--radius-sm);
  transition: background 0.12s;
}

/* 多一列描述 */
.row.with-desc {
  grid-template-columns: 16px minmax(80px, 1fr) minmax(120px, 1.7fr) minmax(110px, 1.3fr) 24px;
}

.desc {
  font-size: var(--font-sm);
}

.row:hover {
  background: var(--field);
}

.head {
  height: 26px;
  color: var(--text-3);
  font-size: var(--font-xs);
}

.head:hover {
  background: none;
}

.check {
  width: 14px;
  height: 14px;
  accent-color: var(--accent);
  cursor: pointer;
}

.cell {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  transition: border-color 0.14s, background 0.14s, box-shadow 0.14s;
}

.cell:hover {
  border-color: var(--border);
}

.cell:focus {
  border-color: var(--accent);
  background: var(--surface-solid);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.mono {
  font-family: var(--mono);
  font-size: var(--font-sm);
}

.remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  color: var(--text-3);
  opacity: 0;
  transition: opacity 0.12s, color 0.12s, background 0.12s;
}

.row:hover .remove {
  opacity: 1;
}

.remove:hover {
  background: var(--red-soft);
  color: var(--red);
}

.add {
  align-self: flex-start;
  margin: 6px 0 0 26px;
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  color: var(--text-2);
  font-size: var(--font-sm);
  transition: color 0.12s, background 0.12s;
}

.add:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

/* 两个浮层共用同一套样式 */
.popover {
  position: fixed;
  z-index: 95;
  overflow: auto;
  padding: 6px;
  border: 1px solid var(--border-glass);
  border-radius: var(--radius);
  background: var(--surface-solid);
  box-shadow: var(--shadow-3);
}

.popover-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  font-family: var(--mono);
  font-size: var(--font-sm);
  text-align: left;
}

.popover-item:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.var {
  font-family: var(--sans);
}

.var-key {
  color: var(--code-key);
  font-size: var(--font-sm);
}

.var-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--text-3);
  font-size: var(--font-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.var-source {
  flex: 0 0 auto;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--neutral-soft);
  color: var(--text-3);
  font-size: 10.5px;
}
</style>
