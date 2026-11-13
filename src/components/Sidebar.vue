<script setup lang="ts">
/**
 * 左侧栏：项目切换 + 接口列表
 *
 * 「即时调试」是内置项目（store 里 scratch = true），不能删也不能改名，
 * 保证任何时候打开都有地方可以立刻发请求。
 */
import { computed, ref } from 'vue'
import {
  activeProject,
  addProject,
  addRequest,
  removeProject,
  removeRequest,
  selectProject,
  selectRequest,
  store,
} from '../store/workspace'
import type { ApiRequest, Project } from '../types'

const menuOpen = ref(false)
const creating = ref(false)
const newProjectName = ref('')
const keyword = ref('')
const renamingId = ref('')
const renameText = ref('')

/** 按名称或地址搜索接口 */
const filtered = computed<ApiRequest[]>(() => {
  const list = activeProject.value?.requests ?? []
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return list
  return list.filter(
    (item) => item.name.toLowerCase().includes(kw) || item.url.toLowerCase().includes(kw),
  )
})

function toggleMenu() {
  menuOpen.value = !menuOpen.value
  creating.value = false
  newProjectName.value = ''
}

function chooseProject(id: string) {
  selectProject(id)
  menuOpen.value = false
  keyword.value = ''
}

function createProject() {
  if (creating.value === false) return
  const name = newProjectName.value.trim()
  if (name) addProject(name)
  creating.value = false
  newProjectName.value = ''
  menuOpen.value = false
}

function askRemoveProject(project: Project) {
  if (!confirm(`删除项目「${project.name}」？里面的接口会一起删除。`)) return
  removeProject(project.id)
}

function askRemoveRequest(request: ApiRequest) {
  if (!confirm(`删除接口「${request.name}」？`)) return
  removeRequest(request.id)
}

function startRename(request: ApiRequest) {
  renamingId.value = request.id
  renameText.value = request.name
}

function finishRename(request: ApiRequest) {
  const name = renameText.value.trim()
  if (name) request.name = name
  renamingId.value = ''
}

function createRequest() {
  addRequest()
}
</script>

<template>
  <aside class="sidebar">
    <!-- 品牌 -->
    <div class="brand">
      <span class="logo" />
      <span class="brand-name">apix</span>
      <span class="badge">本地</span>
    </div>

    <!-- 项目切换 -->
    <div class="project-wrap">
      <button class="project" :class="{ open: menuOpen }" @click="toggleMenu">
        <span class="project-name">{{ activeProject.name }}</span>
        <svg class="chevron" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 4l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <!-- 点击空白处关闭下拉 -->
      <div v-if="menuOpen" class="overlay" @click="menuOpen = false" />

      <div v-if="menuOpen" class="menu">
        <div
          v-for="project in store.projects"
          :key="project.id"
          class="menu-item"
          :class="{ active: project.id === store.activeProjectId }"
          @click="chooseProject(project.id)"
        >
          <span class="menu-text">{{ project.name }}</span>
          <span v-if="project.scratch" class="tag">默认</span>
          <button v-else class="menu-del" title="删除项目" @click.stop="askRemoveProject(project)">
            ×
          </button>
        </div>

        <div class="menu-sep" />

        <div v-if="!creating" class="menu-item add" @click="creating = true">+ 新建项目</div>
        <div v-else class="menu-item">
          <input
            v-model="newProjectName"
            class="menu-input"
            placeholder="项目名称，回车确认"
            :ref="(el: any) => el?.focus()"
            @keydown.enter="createProject"
            @keydown.esc="creating = false"
            @blur="createProject"
          />
        </div>
      </div>
    </div>

    <!-- 搜索 -->
    <div class="search">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="5" cy="5" r="3.4" fill="none" stroke="currentColor" stroke-width="1.2" />
        <path d="M7.6 7.6L10 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
      </svg>
      <input v-model="keyword" placeholder="搜索接口" spellcheck="false" />
    </div>

    <!-- 接口列表 -->
    <div class="list">
      <div
        v-for="item in filtered"
        :key="item.id"
        class="item"
        :class="{ on: item.id === store.activeRequestId }"
        @click="selectRequest(item.id)"
      >
        <span class="method" :class="`m-${item.method}`">{{ item.method }}</span>

        <input
          v-if="renamingId === item.id"
          v-model="renameText"
          class="rename"
          :ref="(el: any) => el?.focus()"
          @click.stop
          @keydown.enter="finishRename(item)"
          @keydown.esc="renamingId = ''"
          @blur="finishRename(item)"
        />
        <span v-else class="label" :title="item.url" @dblclick.stop="startRename(item)">
          {{ item.name }}
        </span>

        <button class="del" title="删除接口" @click.stop="askRemoveRequest(item)">×</button>
      </div>

      <p v-if="!filtered.length" class="empty">
        {{ keyword ? '没有匹配的接口' : '这里还没有接口' }}
      </p>
    </div>

    <!-- 新建接口 -->
    <button class="new" @click="createRequest">+ 新建接口</button>
  </aside>
</template>

<style scoped>
.sidebar {
  flex: 0 0 252px;
  width: 252px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-bottom: 10px;
  border-right: 1px solid var(--border);
  background: var(--sidebar-bg);
}

.brand {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 18px 16px 12px;
}

.logo {
  width: 8px;
  height: 8px;
  border-radius: 3px;
  background: var(--accent);
}

.brand-name {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.2px;
}

.badge {
  margin-left: auto;
  padding: 1px 6px;
  border: 1px solid var(--border-strong);
  border-radius: 4px;
  color: var(--text-3);
  font-size: 10.5px;
}

.project-wrap {
  position: relative;
  padding: 0 12px 8px;
}

.project {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  font-size: 12.5px;
  font-weight: 500;
  transition: border-color 0.12s;
}

.project:hover,
.project.open {
  border-color: var(--border-strong);
}

.project-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  flex: 0 0 auto;
  color: var(--text-3);
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
}

.menu {
  position: absolute;
  top: calc(100% - 2px);
  left: 12px;
  right: 12px;
  z-index: 31;
  padding: 5px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: 0 8px 24px rgb(28 28 26 / 8%);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 12.5px;
  cursor: pointer;
}

.menu-item:hover {
  background: #f7f7f5;
}

.menu-item.active {
  color: var(--accent);
}

.menu-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag {
  color: var(--text-3);
  font-size: 10.5px;
}

.menu-del {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  color: var(--text-3);
  font-size: 14px;
  line-height: 1;
  opacity: 0;
}

.menu-item:hover .menu-del {
  opacity: 1;
}

.menu-del:hover {
  color: var(--red);
}

.menu-sep {
  height: 1px;
  margin: 5px 4px;
  background: var(--border);
}

.menu-item.add {
  color: var(--text-2);
}

.menu-item.add:hover {
  color: var(--accent);
}

.menu-input {
  width: 100%;
  height: 24px;
  padding: 0 2px;
  border: none;
  background: transparent;
  font-size: 12.5px;
}

.search {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 12px 6px;
  padding: 0 8px;
  height: 30px;
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

.search input::placeholder {
  color: var(--text-3);
}

.list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 8px;
}

.item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 6px 0 8px;
  border-radius: 6px;
  cursor: pointer;
}

.item:hover {
  background: #efefec;
}

.item.on {
  background: var(--surface);
  box-shadow: 0 1px 2px rgb(28 28 26 / 5%);
}

.item.on::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
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

.empty {
  margin: 18px 8px;
  color: var(--text-3);
  font-size: 12px;
  text-align: center;
}

.new {
  flex: 0 0 auto;
  margin: 8px 12px 0;
  height: 30px;
  border: 1px dashed var(--border-strong);
  border-radius: 7px;
  color: var(--text-2);
  font-size: 12.5px;
  transition: color 0.12s, border-color 0.12s, background 0.12s;
}

.new:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}
</style>
