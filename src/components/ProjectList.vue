<script setup lang="ts">
/**
 * 首页：项目列表（多宫格）
 *
 * 打开客户端先看到这里，而不是直接进某个项目。
 * 「即时调试」是内置项目，永远排第一，不能删也不能改名。
 */
import { ref } from 'vue'
import type { Project } from '../types'
import { addProject, openProject, removeProject, renameProject, store } from '../store/workspace'
import { openMenu, type MenuItem } from '../store/contextMenu'
import ThemeMenu from './ThemeMenu.vue'

const emit = defineEmits<{ open: [id: string] }>()

const creating = ref(false)
const draft = ref('')
const renamingId = ref('')
const renameDraft = ref('')

function enter(project: Project) {
  openProject(project.id)
  emit('open', project.id)
}

function create() {
  const name = draft.value.trim()
  if (!name) {
    creating.value = false
    return
  }
  const project = addProject(name)
  creating.value = false
  draft.value = ''
  if (project) enter(project)
}

function cancelCreate() {
  creating.value = false
  draft.value = ''
}

function startRename(project: Project) {
  renameDraft.value = project.name
  renamingId.value = project.id
}

function finishRename(project: Project) {
  if (!renamingId.value) return
  renameProject(project.id, renameDraft.value)
  renamingId.value = ''
}

function askRemove(project: Project) {
  if (confirm(`删除项目「${project.name}」？里面的接口和环境变量会一起删除。`)) {
    removeProject(project.id)
  }
}

function cardMenu(event: MouseEvent, project: Project) {
  const items: MenuItem[] = [
    { label: '打开项目', action: () => enter(project) },
    { label: '重命名', action: () => startRename(project) },
  ]
  if (!project.scratch) {
    items.push({ separator: true })
    items.push({ label: '删除项目', danger: true, action: () => askRemove(project) })
  }
  openMenu(event, items)
}
</script>

<template>
  <div class="page">
    <header class="head">
      <div class="brand">
        <span class="logo" />
        <span class="brand-name">apix</span>
      </div>
      <ThemeMenu />
    </header>

    <div class="content">
      <h1>项目</h1>
      <p class="sub">选一个项目开始调试。不同项目的接口、环境变量互相独立。</p>

      <div class="grid">
        <article
          v-for="project in store.projects"
          :key="project.id"
          class="card"
          @click="enter(project)"
          @contextmenu.prevent="cardMenu($event, project)"
        >
          <div class="card-top">
            <input
              v-if="renamingId === project.id"
              v-model="renameDraft"
              class="rename"
              :ref="(el: any) => el?.focus()"
              @click.stop
              @keydown.enter="finishRename(project)"
              @keydown.esc="renamingId = ''"
              @blur="finishRename(project)"
            />
            <span v-else class="card-name" @dblclick.stop="startRename(project)">
              {{ project.name }}
            </span>
            <span v-if="project.scratch" class="badge">默认</span>
          </div>

          <div class="meta">
            <span>{{ project.requests.length }} 个接口</span>
            <span class="sep">·</span>
            <span>{{ project.folders.length }} 个目录</span>
            <span class="sep">·</span>
            <span>{{ project.environments.length }} 个环境</span>
          </div>
        </article>

        <button v-if="!creating" class="card new" @click="creating = true">+ 新建项目</button>
        <div v-else class="card new">
          <input
            v-model="draft"
            class="new-input"
            placeholder="项目名称，回车创建"
            :ref="(el: any) => el?.focus()"
            @keydown.enter="create"
            @keydown.esc="cancelCreate"
            @blur="create"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg);
  overflow: auto;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 7px;
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

.content {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

h1 {
  margin: 0;
  font-size: 19px;
  font-weight: 500;
}

.sub {
  margin: 6px 0 22px;
  color: var(--text-3);
  font-size: 12.5px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
  gap: 14px;
}

.card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 18px;
  min-height: 104px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.14s, box-shadow 0.14s;
}

.card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-card);
}

.card-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 13.5px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  flex: 0 0 auto;
  padding: 1px 6px;
  border: 1px solid var(--border-strong);
  border-radius: 4px;
  color: var(--text-3);
  font-size: 10.5px;
}

.meta {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-3);
  font-size: 11.5px;
}

.sep {
  color: var(--border-strong);
}

.rename {
  flex: 1;
  min-width: 0;
  height: 24px;
  padding: 0 6px;
  border: 1px solid var(--accent);
  border-radius: 5px;
  background: var(--surface);
  font-size: 13.5px;
}

.new {
  align-items: center;
  justify-content: center;
  border-style: dashed;
  color: var(--text-3);
  font-size: 12.5px;
  text-align: center;
}

.new:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.new-input {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--accent);
  border-radius: 6px;
  background: var(--surface);
  font-size: 13px;
  text-align: center;
}
</style>
