<script setup lang="ts">
/**
 * 侧边栏里的一个接口
 *
 * 单击选中、双击改名、右键出菜单。depth 用来做缩进，支持放在多层目录里。
 */
import { ref } from 'vue'
import type { ApiRequest } from '../types'
import { removeRequest, renameRequest, selectRequest, store } from '../store/workspace'
import { openMenu } from '../store/contextMenu'
import { askConfirm } from '../store/confirm'

const props = defineProps<{ request: ApiRequest; depth: number }>()

const renaming = ref(false)
const draft = ref('')

function startRename() {
  draft.value = props.request.name
  renaming.value = true
}

function finishRename() {
  if (!renaming.value) return
  renameRequest(props.request.id, draft.value)
  renaming.value = false
}

async function askRemove() {
  const ok = await askConfirm({
    title: `删除接口「${props.request.name}」？`,
    message: '删除后无法恢复。',
  })
  if (ok) removeRequest(props.request.id)
}

function onContextMenu(event: MouseEvent) {
  openMenu(event, [
    { label: '重命名', action: startRename },
    { separator: true },
    { label: '删除接口', danger: true, action: askRemove },
  ])
}
</script>

<template>
  <!-- 缩进规则：根级接口和根目录的图标对齐，目录里的接口和父目录的图标对齐 -->
  <div
    class="item"
    :class="{ on: request.id === store.activeRequestId }"
    :style="{ paddingLeft: `${depth === 0 ? 24 : 8 + depth * 16}px` }"
    @click="selectRequest(request.id)"
    @contextmenu.stop="onContextMenu"
  >
    <span class="method" :class="`m-${request.method}`">{{ request.method }}</span>

    <input
      v-if="renaming"
      v-model="draft"
      class="rename"
      :ref="(el: any) => el?.focus()"
      @click.stop
      @keydown.enter="finishRename"
      @keydown.esc="renaming = false"
      @blur="finishRename"
    />
    <span v-else class="label" :title="request.url" @dblclick.stop="startRename">
      {{ request.name }}
    </span>

    <button class="del" title="删除" @click.stop="askRemove">
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
</template>

<style scoped>
.item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  height: var(--h-row);
  padding-right: 6px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.13s, box-shadow 0.13s;
}

.item:hover {
  background: var(--hover);
}

.item.on {
  background: var(--surface-solid);
  box-shadow: var(--shadow-1), inset 2.5px 0 0 0 var(--accent);
}

.item.on .label {
  color: var(--text);
  font-weight: 500;
}

.method {
  flex: 0 0 auto;
  width: 38px;
  font-family: var(--mono);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: -0.2px;
}

.label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--text-2);
  font-size: var(--font-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rename {
  flex: 1;
  min-width: 0;
  height: 24px;
  padding: 0 6px;
  border: 1px solid var(--accent);
  border-radius: 6px;
  background: var(--surface-solid);
  font-size: var(--font-sm);
}

.del {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  color: var(--text-3);
  opacity: 0;
  transition: opacity 0.13s, color 0.13s, background 0.13s;
}

.item:hover .del {
  opacity: 1;
}

.del:hover {
  background: var(--red-soft);
  color: var(--red);
}
</style>
