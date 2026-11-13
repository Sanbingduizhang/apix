<script setup lang="ts">
/**
 * key-value 表格（请求头 / 表单 / 变量都用它）
 *
 * 传了 suggestions 就会出现"键名候选"：点输入框时弹出常用请求头，
 * 免得每次手打 Content-Type 拼错。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { KeyValueRow } from '../types'
import { createKeyValueRow } from '../store/workspace'

const props = withDefaults(
  defineProps<{
    rows: KeyValueRow[]
    /** 键名候选；不传就没有下拉 */
    suggestions?: string[]
    keyPlaceholder?: string
    valuePlaceholder?: string
  }>(),
  { suggestions: () => [], keyPlaceholder: '键名', valuePlaceholder: '值' },
)

/** 当前正在编辑的行，-1 表示没有 */
const focused = ref(-1)
/** 候选浮层的位置（用 fixed 定位，避免被编辑区的滚动容器裁掉） */
const anchor = ref({ left: 0, top: 0, width: 232, maxHeight: 240 })

const activeRow = computed<KeyValueRow | null>(() =>
  focused.value >= 0 ? (props.rows[focused.value] ?? null) : null,
)

const activeSuggestions = computed(() => (activeRow.value ? suggestionsFor(activeRow.value) : []))

function addRow() {
  props.rows.push(createKeyValueRow())
}

function removeRow(index: number) {
  props.rows.splice(index, 1)
  focused.value = -1
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

/** 聚焦时记下输入框位置，候选框贴着它下面弹出来 */
function onFocus(event: FocusEvent, index: number) {
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  focused.value = index
  anchor.value = {
    left: rect.left,
    top: rect.bottom + 3,
    width: Math.max(232, rect.width),
    maxHeight: Math.max(120, window.innerHeight - rect.bottom - 16),
  }
}

/** 选中候选（mousedown.prevent 保证输入框不会先失焦） */
function pick(row: KeyValueRow, value: string) {
  row.key = value
  focused.value = -1
}

/** 页面一滚动，位置就不准了，直接收起 */
function onScroll() {
  if (focused.value >= 0) focused.value = -1
}

onMounted(() => window.addEventListener('scroll', onScroll, true))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll, true))

</script>

<template>
  <div class="kv">
    <div v-if="rows.length" class="row head">
      <span />
      <span>{{ keyPlaceholder }}</span>
      <span>{{ valuePlaceholder }}</span>
      <span />
    </div>

    <div v-for="(row, index) in rows" :key="row.id" class="row">
      <input v-model="row.enabled" type="checkbox" class="check" />

      <div class="key-cell">
        <input
          v-model="row.key"
          class="cell mono"
          :placeholder="keyPlaceholder"
          spellcheck="false"
          @focus="onFocus($event, index)"
          @blur="focused = -1"
        />
      </div>

      <input
        v-model="row.value"
        class="cell mono"
        :placeholder="valuePlaceholder"
        spellcheck="false"
        @focus="focused = -1"
      />

      <button class="remove" title="删除这一行" @click="removeRow(index)">×</button>
    </div>

    <button class="add" @click="addRow">+ 添加一行</button>

    <!-- 候选浮层拆到 body 上，才不会被外面的滚动容器裁掉 -->
    <Teleport to="body">
      <div
        v-if="activeSuggestions.length"
        class="suggest"
        :style="{
          left: `${anchor.left}px`,
          top: `${anchor.top}px`,
          width: `${anchor.width}px`,
          maxHeight: `${anchor.maxHeight}px`,
        }"
      >
        <button
          v-for="item in activeSuggestions"
          :key="item"
          class="suggest-item"
          @mousedown.prevent="activeRow && pick(activeRow, item)"
        >
          {{ item }}
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
  grid-template-columns: 16px 1fr 1.5fr 22px;
  align-items: center;
  gap: 10px;
  height: 32px;
  padding: 0 4px;
  border-radius: 6px;
}

.row:hover {
  background: var(--field);
}

.head {
  height: 24px;
  color: var(--text-3);
  font-size: 11px;
}

.head:hover {
  background: none;
}

.check {
  width: 13px;
  height: 13px;
  accent-color: var(--accent);
  cursor: pointer;
}

.key-cell {
  position: relative;
  min-width: 0;
}

.cell {
  width: 100%;
  height: 26px;
  padding: 0 6px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  transition: border-color 0.12s, background 0.12s;
}

.cell:hover {
  border-color: var(--border);
}

.cell:focus {
  border-color: var(--accent);
  background: var(--surface);
}

.mono {
  font-family: var(--mono);
  font-size: 12.5px;
}

/* 用 fixed 定位，坐标由 JS 按输入框位置算 */
.suggest {
  position: fixed;
  z-index: 95;
  overflow: auto;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-pop);
}

.suggest-item {
  display: block;
  width: 100%;
  padding: 4px 8px;
  border-radius: 5px;
  font-family: var(--mono);
  font-size: 12px;
  text-align: left;
}

.suggest-item:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.remove {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  color: var(--text-3);
  font-size: 15px;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.12s, color 0.12s;
}

.row:hover .remove {
  opacity: 1;
}

.remove:hover {
  color: var(--red);
}

.add {
  align-self: flex-start;
  margin: 6px 0 0 26px;
  padding: 4px 8px;
  border-radius: 6px;
  color: var(--text-2);
  font-size: 12px;
}

.add:hover {
  color: var(--accent);
  background: var(--accent-soft);
}
</style>
