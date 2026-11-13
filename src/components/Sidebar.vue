<script setup lang="ts">
/**
 * 左侧接口树
 *
 * 没有搜索词时显示「目录 + 接口」的树结构；
 * 一旦输入搜索词，就摊平成匹配结果列表——比在树里逐层过滤更好理解。
 */
import { computed, ref } from 'vue'
import { activeProject, addFolder, addRequest } from '../store/workspace'
import { openMenu } from '../store/contextMenu'
import FolderNode from './FolderNode.vue'
import RequestItem from './RequestItem.vue'

const keyword = ref('')

/** 根目录下的节点 */
const rootFolders = computed(() => (activeProject.value?.folders ?? []).filter((f) => !f.parentId))
const rootRequests = computed(() =>
  (activeProject.value?.requests ?? []).filter((r) => !r.folderId),
)

/** 搜索结果（按名称或地址匹配） */
const matches = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return []
  return (activeProject.value?.requests ?? []).filter(
    (r) => r.name.toLowerCase().includes(kw) || r.url.toLowerCase().includes(kw),
  )
})

const isEmpty = computed(
  () => !rootFolders.value.length && !rootRequests.value.length && !keyword.value.trim(),
)

/** 工具栏的 + 号：新建接口或目录 */
function onAdd(event: MouseEvent) {
  openMenu(event, [
    { label: '新建接口', action: () => addRequest(null) },
    { label: '新建目录', action: () => addFolder(null) },
  ])
}

/** 空白处右键 */
function onBlankMenu(event: MouseEvent) {
  openMenu(event, [
    { label: '新建接口', action: () => addRequest(null) },
    { label: '新建目录', action: () => addFolder(null) },
  ])
}
</script>

<template>
  <aside class="sidebar">
    <div class="toolbar">
      <div class="search">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="5" cy="5" r="3.4" fill="none" stroke="currentColor" stroke-width="1.2" />
          <path d="M7.6 7.6L10 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        </svg>
        <input v-model="keyword" placeholder="搜索接口" spellcheck="false" />
      </div>
      <button class="add" title="新建接口 / 目录" @click="onAdd">+</button>
    </div>

    <div class="tree" @contextmenu.prevent="onBlankMenu">
      <!-- 搜索时摊平显示 -->
      <template v-if="keyword.trim()">
        <RequestItem v-for="item in matches" :key="item.id" :request="item" :depth="0" />
        <p v-if="!matches.length" class="empty">没有匹配的接口</p>
      </template>

      <!-- 平时显示目录树 -->
      <template v-else>
        <FolderNode v-for="item in rootFolders" :key="item.id" :folder="item" :depth="0" />
        <RequestItem v-for="item in rootRequests" :key="item.id" :request="item" :depth="0" />
        <p v-if="isEmpty" class="empty">右键或点 + 新建接口 / 目录</p>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  flex: 0 0 258px;
  width: 258px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--border);
  background: var(--sidebar-bg);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 10px 6px 12px;
}

.search {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  padding: 0 8px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 7px;
  color: var(--text-3);
}

.search:focus-within {
  border-color: var(--border);
  background: var(--surface);
}

.search input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 12.5px;
}

.add {
  flex: 0 0 26px;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  color: var(--text-2);
  font-size: 17px;
  line-height: 1;
  transition: color 0.12s, background 0.12s;
}

.add:hover {
  color: var(--accent);
  background: var(--accent-soft);
}

.tree {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 4px 8px 16px;
}

.empty {
  margin: 18px 8px;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.7;
  text-align: center;
}
</style>
