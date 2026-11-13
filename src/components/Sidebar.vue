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

const rootFolders = computed(() => (activeProject.value?.folders ?? []).filter((f) => !f.parentId))
const rootRequests = computed(() => (activeProject.value?.requests ?? []).filter((r) => !r.folderId))

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

function onAdd(event: MouseEvent) {
  openMenu(event, [
    { label: '新建接口', action: () => addRequest(null) },
    { label: '新建目录', action: () => addFolder(null) },
  ])
}

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
        <svg width="13" height="13" viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="5" cy="5" r="3.4" fill="none" stroke="currentColor" stroke-width="1.3" />
          <path d="M7.6 7.6L10 10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
        </svg>
        <input v-model="keyword" placeholder="搜索接口" spellcheck="false" />
      </div>
      <button class="add" title="新建接口 / 目录" @click="onAdd">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M7 2.6v8.8M2.6 7h8.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <div class="tree" @contextmenu.prevent="onBlankMenu">
      <template v-if="keyword.trim()">
        <RequestItem v-for="item in matches" :key="item.id" :request="item" :depth="0" />
        <p v-if="!matches.length" class="empty">没有匹配的接口</p>
      </template>

      <template v-else>
        <FolderNode v-for="item in rootFolders" :key="item.id" :folder="item" :depth="0" />
        <RequestItem v-for="item in rootRequests" :key="item.id" :request="item" :depth="0" />
        <p v-if="isEmpty" class="empty">右键或点 +<br />新建接口 / 目录</p>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  flex: 0 0 272px;
  width: 272px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px 10px 10px;
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
  background: var(--surface);
  backdrop-filter: var(--blur);
  box-shadow: var(--shadow-2);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 2px 8px;
}

.search {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: var(--radius);
  background: var(--field);
  color: var(--text-3);
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.search:focus-within {
  border-color: var(--accent);
  background: var(--surface-solid);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.search input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: var(--font-sm);
}

.add {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  border-radius: var(--radius);
  color: var(--text-2);
  transition: color 0.15s, background 0.15s, transform 0.15s;
}

.add:hover {
  background: var(--accent-soft);
  color: var(--accent);
  transform: rotate(90deg);
}

.tree {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 2px;
}

.empty {
  margin: 28px 10px;
  color: var(--text-3);
  font-size: var(--font-sm);
  line-height: 1.8;
  text-align: center;
}
</style>
