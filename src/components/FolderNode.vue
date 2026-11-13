<script setup lang="ts">
/**
 * 目录节点（递归组件）
 *
 * 自己渲染自己的子目录，所以目录可以无限嵌套。
 * 数据是扁平的（每个目录有 parentId），这里只是按 parentId 把子节点挑出来。
 */
import { computed, ref } from 'vue'
import type { Folder } from '../types'
import {
  activeProject,
  addFolder,
  addRequest,
  countRequestsInFolder,
  removeFolder,
  renameFolder,
} from '../store/workspace'
import { openMenu } from '../store/contextMenu'
import { askConfirm } from '../store/confirm'
import RequestItem from './RequestItem.vue'

const props = defineProps<{ folder: Folder; depth: number }>()

const open = ref(true)
const renaming = ref(false)
const draft = ref('')

const childFolders = computed(() =>
  (activeProject.value?.folders ?? []).filter((item) => item.parentId === props.folder.id),
)

const childRequests = computed(() =>
  (activeProject.value?.requests ?? []).filter((item) => item.folderId === props.folder.id),
)

const count = computed(() => countRequestsInFolder(props.folder.id))

function startRename() {
  draft.value = props.folder.name
  renaming.value = true
}

function finishRename() {
  if (!renaming.value) return
  renameFolder(props.folder.id, draft.value)
  renaming.value = false
}

async function askRemove() {
  const ok = await askConfirm({
    title: `删除目录「${props.folder.name}」？`,
    message: count.value
      ? `里面的子目录和 ${count.value} 个接口会一起删除，无法恢复。`
      : '目录里的内容会一起删除，无法恢复。',
  })
  if (ok) removeFolder(props.folder.id)
}

function onContextMenu(event: MouseEvent) {
  openMenu(event, [
    { label: '新建接口', action: () => addRequest(props.folder.id) },
    { label: '新建子目录', action: () => addFolder(props.folder.id) },
    { separator: true },
    { label: '重命名', action: startRename },
    { label: '删除目录', danger: true, action: askRemove },
  ])
}
</script>

<template>
  <div>
    <div
      class="folder"
      :style="{ paddingLeft: `${8 + depth * 16}px` }"
      @click="open = !open"
      @contextmenu.stop="onContextMenu"
    >
      <svg class="chevron" :class="{ open }" width="12" height="12" viewBox="0 0 12 12">
        <path
          d="M4.4 2.6L7.8 6l-3.4 3.4"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>

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
      <span v-else class="name" @dblclick.stop="startRename">{{ folder.name }}</span>

      <span v-if="count" class="count">{{ count }}</span>
    </div>

    <template v-if="open">
      <FolderNode v-for="item in childFolders" :key="item.id" :folder="item" :depth="depth + 1" />
      <RequestItem v-for="item in childRequests" :key="item.id" :request="item" :depth="depth + 1" />
    </template>
  </div>
</template>

<style scoped>
.folder {
  display: flex;
  align-items: center;
  gap: 6px;
  height: var(--h-row);
  padding-right: 8px;
  border-radius: var(--radius);
  color: var(--text-2);
  cursor: pointer;
  user-select: none;
  transition: background 0.13s, color 0.13s;
}

.folder:hover {
  background: var(--hover);
  color: var(--text);
}

.chevron {
  flex: 0 0 auto;
  color: var(--text-3);
  transition: transform 0.16s ease;
}

.chevron.open {
  transform: rotate(90deg);
}

.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: var(--font-sm);
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.count {
  color: var(--text-3);
  font-size: var(--font-xs);
  font-variant-numeric: tabular-nums;
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
</style>
