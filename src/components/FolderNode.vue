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

function askRemove() {
  const message = count.value
    ? `删除目录「${props.folder.name}」？里面的 ${count.value} 个接口会一起删除。`
    : `删除目录「${props.folder.name}」？`
  if (confirm(message)) removeFolder(props.folder.id)
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
      :style="{ paddingLeft: `${6 + depth * 15}px` }"
      @click="open = !open"
      @contextmenu.stop="onContextMenu"
    >
      <svg class="chevron" :class="{ open }" width="10" height="10" viewBox="0 0 10 10">
        <path
          d="M3.5 2l3 3-3 3"
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
      <FolderNode
        v-for="item in childFolders"
        :key="item.id"
        :folder="item"
        :depth="depth + 1"
      />
      <RequestItem
        v-for="item in childRequests"
        :key="item.id"
        :request="item"
        :depth="depth + 1"
      />
    </template>
  </div>
</template>

<style scoped>
.folder {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding-right: 6px;
  border-radius: 6px;
  color: var(--text-2);
  cursor: pointer;
  user-select: none;
}

.folder:hover {
  background: var(--hover);
}

.chevron {
  flex: 0 0 auto;
  color: var(--text-3);
  transition: transform 0.12s;
}

.chevron.open {
  transform: rotate(90deg);
}

.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.count {
  color: var(--text-3);
  font-size: 11px;
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
</style>
