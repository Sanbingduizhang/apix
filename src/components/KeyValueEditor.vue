<script setup lang="ts">
/**
 * 请求头编辑器（一个 key-value 表格）
 *
 * 这个组件故意做得很薄：它不复制数据，直接修改传进来的 rows 数组，
 * 因为 rows 来自 store，是响应式的，改了就自动存盘。
 */
import type { HeaderRow } from '../types'
import { createHeaderRow } from '../store/workspace'

const props = defineProps<{ rows: HeaderRow[] }>()

/** 追加一个空行 */
function addRow() {
  props.rows.push(createHeaderRow())
}

/** 删掉某一行 */
function removeRow(index: number) {
  props.rows.splice(index, 1)
}
</script>

<template>
  <div class="kv">
    <!-- 有内容时才显示表头，空表格更干净 -->
    <div v-if="rows.length" class="row head">
      <span />
      <span>键</span>
      <span>值</span>
      <span />
    </div>

    <div v-for="(row, index) in rows" :key="row.id" class="row">
      <input v-model="row.enabled" type="checkbox" class="check" />
      <input v-model="row.key" class="cell mono" placeholder="键名" spellcheck="false" />
      <input v-model="row.value" class="cell mono" placeholder="值" spellcheck="false" />
      <button class="remove" title="删除这一行" @click="removeRow(index)">×</button>
    </div>

    <button class="add" @click="addRow">+ 添加一行</button>
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
  background: #fbfbfa;
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
