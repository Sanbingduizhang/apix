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

function askRemove() {
  if (confirm(`删除接口「${props.request.name}」？`)) removeRequest(props.request.id)
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
  <div
    class="item"
    :class="{ on: request.id === store.activeRequestId }"
    :style="{ paddingLeft: `${8 + depth * 15}px` }"
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

    <button class="del" title="删除" @click.stop="askRemove">×</button>
  </div>
</template>

<style scoped>
.item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding-right: 6px;
  border-radius: 6px;
  cursor: pointer;
}

.item:hover {
  background: var(--hover);
}

.item.on {
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.item.on::before {
  content: '';
  position: absolute;
  left: 0;
  top: 7px;
  bottom: 7px;
  width: 2px;
  border-radius: 2px;
  background: var(--accent);
}

.item.on .label {
  color: var(--text);
  font-weight: 500;
}

.method {
  flex: 0 0 auto;
  width: 34px;
  font-family: var(--mono);
  font-size: 9.5px;
  letter-spacing: -0.2px;
}

.label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--text-2);
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rename {
  flex: 1;
  min-width: 0;
  height: 22px;
  padding: 0 4px;
  border: 1px solid var(--accent);
  border-radius: 4px;
  background: var(--surface);
  font-size: 12.5px;
}

.del {
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  color: var(--text-3);
  font-size: 14px;
  line-height: 1;
  opacity: 0;
}

.item:hover .del {
  opacity: 1;
}

.del:hover {
  color: var(--red);
}
</style>
