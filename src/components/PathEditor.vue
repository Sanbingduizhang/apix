<script setup lang="ts">
/**
 * 路径变量
 *
 * 地址里写 /users/:id 或 /users/{id}，这里就会列出一行让你填值。
 * 行的同步在 RequestEditor 里做（地址一变就同步），这里只负责显示和编辑。
 */
import type { ApiRequest } from '../types'

defineProps<{ request: ApiRequest }>()
</script>

<template>
  <div class="path">
    <template v-if="request.pathParams.length">
      <div class="row head">
        <span>变量</span>
        <span>值</span>
        <span>描述</span>
      </div>

      <div v-for="row in request.pathParams" :key="row.id" class="row">
        <span class="name mono">{{ ':' + row.key }}</span>
        <input v-model="row.value" class="input mono" placeholder="填一个值" spellcheck="false" />
        <input v-model="row.desc" class="input" placeholder="说明（可选）" spellcheck="false" />
      </div>

      <p class="tip">路径变量直接从地址里读出来，改地址这里就跟着变。</p>
    </template>

    <div v-else class="empty">
      <p>地址里没有路径变量</p>
      <span>
        把地址写成 <code>/users/:id</code>（或 <code>/users/{id}</code>），变量会自动出现在这里
      </span>
    </div>
  </div>
</template>

<style scoped>
.path {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row {
  display: grid;
  grid-template-columns: minmax(90px, 0.9fr) minmax(140px, 1.6fr) minmax(110px, 1.2fr);
  align-items: center;
  gap: 12px;
  height: var(--h-row);
  padding: 0 10px;
  border-radius: var(--radius-sm);
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

.name {
  overflow: hidden;
  color: var(--code-key);
  font-size: var(--font-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.input {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-solid);
  font-size: var(--font-sm);
  transition: border-color 0.14s, background 0.14s, box-shadow 0.14s;
}

.input:hover {
  border-color: var(--border-strong);
}

.input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.mono {
  font-family: var(--mono);
}

.tip {
  margin: 8px 0 0 10px;
  color: var(--text-3);
  font-size: var(--font-xs);
}

.empty {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: var(--text-3);
  font-size: var(--font-sm);
  text-align: center;
}

.empty p {
  margin: 0;
  color: var(--text-2);
}

.empty span {
  font-size: var(--font-xs);
}

code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--neutral-soft);
  font-family: var(--mono);
}
</style>
