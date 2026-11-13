<script setup lang="ts">
/**
 * 表单编辑器（multipart/form-data）
 *
 * 每一行可以是「文本」或「文件」。文件内容不存数据库也不存 localStorage，
 * 选完就放在内存缓存里（store/fileCache.ts），发送时再取出来。
 */
import { ref } from 'vue'
import type { FormRow } from '../types'
import { createFormRow } from '../store/workspace'
import { dropFile, formatFileSize, getFile, putFile } from '../store/fileCache'

const props = defineProps<{ rows: FormRow[] }>()

/** 正在等待选文件的行 */
const pendingRow = ref<FormRow | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

function addRow() {
  props.rows.push(createFormRow())
}

function removeRow(index: number) {
  const row = props.rows[index]
  if (row) dropFile(row.id)
  props.rows.splice(index, 1)
}

/** 文本 / 文件 之间切换，切换时把另一边的值清掉，避免发送时混淆 */
function toggleType(row: FormRow) {
  if (row.type === 'file') {
    dropFile(row.id)
    row.fileName = undefined
    row.fileSize = undefined
    row.fileType = undefined
    row.type = 'text'
  } else {
    row.value = ''
    row.type = 'file'
  }
}

function pick(row: FormRow) {
  pendingRow.value = row
  fileInput.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  const row = pendingRow.value
  if (file && row) {
    await putFile(row.id, file)
    row.fileName = file.name
    row.fileSize = file.size
    row.fileType = file.type
  }
  // 清空 input，这样连选同一个文件也能触发 change
  input.value = ''
  pendingRow.value = null
}

/** 选了文件但内存里没有（通常是刷新过页面） */
function needsReselect(row: FormRow): boolean {
  return !!row.fileName && !getFile(row.id)
}</script>

<template>
  <div class="form-editor">
    <div v-if="rows.length" class="row head">
      <span />
      <span>字段名</span>
      <span>类型</span>
      <span>字段值</span>
      <span />
    </div>

    <div v-for="(row, index) in rows" :key="row.id" class="row">
      <input v-model="row.enabled" type="checkbox" class="check" />

      <input v-model="row.key" class="cell mono" placeholder="字段名" spellcheck="false" />

      <button
        class="type"
        :class="{ 'is-file': row.type === 'file' }"
        :title="row.type === 'file' ? '点击改为文本' : '点击改为文件上传'"
        @click="toggleType(row)"
      >
        {{ row.type === 'file' ? '文件' : '文本' }}
      </button>

      <div class="value-cell">
        <input
          v-if="row.type === 'text'"
          v-model="row.value"
          class="cell mono"
          placeholder="字段值"
          spellcheck="false"
        />

        <template v-else>
          <button class="file" @click="pick(row)">
            <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M7 9.5V2M4.2 4.6L7 1.8l2.8 2.8M2.5 9.5v2.2h9V9.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span v-if="row.fileName" class="file-name">{{ row.fileName }}</span>
            <span v-else class="file-hint">选择文件</span>
            <span v-if="needsReselect(row)" class="file-warn">需重新选择</span>
            <span v-else-if="row.fileName" class="file-size">{{ formatFileSize(row.fileSize) }}</span>
          </button>
        </template>
      </div>

      <button class="remove" title="删除这一行" @click="removeRow(index)">×</button>
    </div>

    <button class="add" @click="addRow">+ 添加一行</button>

    <!-- 全组件共用一个隐藏的文件选择框 -->
    <input ref="fileInput" type="file" class="hidden-input" @change="onFileChange" />
  </div>
</template>

<style scoped>
.form-editor {
  display: flex;
  flex-direction: column;
}

.row {
  display: grid;
  grid-template-columns: 16px minmax(90px, 1fr) 50px minmax(120px, 1.4fr) 24px;
  align-items: center;
  gap: 10px;
  height: var(--h-row);
  padding: 0 4px;
  border-radius: var(--radius-sm);
  transition: background 0.12s;
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

.type {
  height: 24px;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-3);
  font-size: var(--font-xs);
  transition: color 0.14s, border-color 0.14s, background 0.14s;
}

.type:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.type.is-file {
  border-color: transparent;
  background: var(--accent-soft);
  color: var(--accent);
}

.value-cell {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
}

.file {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  height: 30px;
  padding: 0 10px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-2);
  font-size: var(--font-sm);
  transition: border-color 0.14s, color 0.14s, background 0.14s;
}

.file:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-family: var(--mono);
  font-size: 12px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-hint {
  flex: 1;
  text-align: left;
}

.file-size {
  color: var(--text-3);
  font-size: 11px;
}

.file-warn {
  flex: 0 0 auto;
  color: var(--amber);
  font-size: 11px;
}

.remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  color: var(--text-3);
  font-size: 15px;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.12s, color 0.12s, background 0.12s;
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

.hidden-input {
  display: none;
}
</style>
