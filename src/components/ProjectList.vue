<script setup lang="ts">
/**
 * 首页：项目列表（多宫格）
 *
 * 每个项目用 id 算一个色相，卡片背景带一点同色系的渐变，多个项目一眼能分出来。
 * 「即时调试」是内置项目，永远排第一，不能删也不能改名。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Project } from '../types'
import { addProject, openProject, removeProject, renameProject, store } from '../store/workspace'
import { openMenu, type MenuItem } from '../store/contextMenu'
import { askConfirm } from '../store/confirm'
import AppearanceMenu from './AppearanceMenu.vue'

const emit = defineEmits<{ open: [id: string] }>()

const creating = ref(false)
const draft = ref('')
const createRef = ref<HTMLElement | null>(null)
const renamingId = ref('')
const renameDraft = ref('')

const totalRequests = computed(() =>
  store.projects.reduce((sum, project) => sum + project.requests.length, 0),
)

/** 预设色相：从这组里挑，保证几个项目放在一起永远是搭的，不会冒出奇怪的色 */
const HUES = [232, 268, 190, 338, 22, 152, 210, 300]

/** 用项目 id 算一个稳定的色相，保证每次打开颜色一致 */
function hueOf(id: string): number {
  let hash = 2166136261
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return HUES[Math.abs(hash) % HUES.length]
}

function enter(project: Project) {
  openProject(project.id)
  emit('open', project.id)
}

function startCreate() {
  creating.value = true
  draft.value = ''
}

function create() {
  if (!creating.value) return
  const name = draft.value.trim()
  creating.value = false
  draft.value = ''
  if (!name) return
  const project = addProject(name)
  if (project) enter(project)
}

function cancelCreate() {
  creating.value = false
  draft.value = ''
}

/** 点到新建卡片外面就收起来：有内容就建，没内容就取消 */
function onDocumentMousedown(event: MouseEvent) {
  if (!creating.value) return
  const target = event.target as Node
  if (createRef.value?.contains(target)) return
  create()
}

function startRename(project: Project) {
  renamingId.value = project.id
  renameDraft.value = project.name
}

function finishRename(project: Project) {
  if (!renamingId.value) return
  renameProject(project.id, renameDraft.value)
  renamingId.value = ''
}

async function askRemove(project: Project) {
  const ok = await askConfirm({
    title: `删除项目「${project.name}」？`,
    message: '项目里的接口、目录和环境变量会一起删除，无法恢复。',
    confirmText: '删除项目',
  })
  if (ok) removeProject(project)
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

onMounted(() => document.addEventListener('mousedown', onDocumentMousedown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentMousedown))
</script>

<template>
  <div class="page">
    <header class="head">
      <div class="brand">
        <span class="logo" />
        <span class="brand-name">apix</span>
        <span class="brand-sub">HTTP 调试</span>
      </div>
      <AppearanceMenu />
    </header>

    <div class="content">
      <div class="title-row">
        <div>
          <h1>项目</h1>
          <p class="sub">{{ store.projects.length }} 个项目 · {{ totalRequests }} 个接口</p>
        </div>
      </div>

      <div class="grid">
        <article
          v-for="project in store.projects"
          :key="project.id"
          class="card"
          :style="{ '--h': hueOf(project.id) }"
          @click="enter(project)"
          @contextmenu.prevent="cardMenu($event, project)"
        >
          <div class="card-body">
            <div class="card-top">
              <span class="mark" />
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
              <h2 v-else class="card-name" @dblclick.stop="startRename(project)">
                {{ project.name }}
              </h2>

              <span v-if="project.scratch" class="badge">默认</span>

              <button class="more" title="更多" @click.stop="cardMenu($event, project)">⋯</button>
            </div>

            <div class="chips">
              <span class="chip">{{ project.requests.length }} 接口</span>
              <span class="chip">{{ project.folders.length }} 目录</span>
              <span class="chip">{{ project.environments.length }} 环境</span>
            </div>
          </div>

          <div class="card-foot">
            <span class="env">
              <span class="env-dot" />
              {{ project.environments.find((e) => e.id === project.activeEnvId)?.name ?? '无环境' }}
            </span>
            <span class="enter">进入 →</span>
          </div>
        </article>

        <button v-if="!creating" ref="createRef" class="card new" @click="startCreate">
          <span class="plus">+</span>
          <span>新建项目</span>
        </button>

        <div v-else ref="createRef" class="card new creating">
          <input
            v-model="draft"
            class="new-input"
            placeholder="项目名称，回车创建"
            :ref="(el: any) => el?.focus()"
            @click.stop
            @keydown.enter="create"
            @keydown.esc="cancelCreate"
            @blur="create"
          />
          <span class="new-hint">回车确认 · Esc 取消</span>
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
  overflow: auto;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px 6px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 9px;
}

.logo {
  width: 11px;
  height: 11px;
  border-radius: 4px;
  background: var(--accent);
  box-shadow: 0 2px 8px -2px var(--accent);
}

.brand-name {
  font-size: var(--font-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.brand-sub {
  color: var(--text-3);
  font-size: var(--font-sm);
}

.content {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 26px 28px 70px;
}

.title-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
}

h1 {
  margin: 0;
  font-size: var(--font-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
}

.sub {
  margin: 6px 0 0;
  color: var(--text-3);
  font-size: var(--font-sm);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(288px, 1fr));
  gap: 18px;
}

/* ---- 项目卡片：新拟物（凸起），每个项目带一点自己的色调 ---- */
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 186px;
  padding: 22px;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: var(--radius-xl);
  /* 用极淡的同色相底区分项目，不用渐变 */
  background: hsl(var(--h) 34% 97.6%);
  box-shadow: var(--neu-out);
  text-align: left;
  cursor: pointer;
  transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.3, 1), box-shadow 0.22s,
    border-color 0.22s, background 0.22s;
}

[data-theme='dark'] .card {
  background: hsl(var(--h) 8% 17.5%);
}

/* 左上角的小色块，一眼认出是哪个项目 */
.mark {
  flex: 0 0 auto;
  width: 9px;
  height: 9px;
  margin-right: 2px;
  border-radius: 3px;
  background: hsl(var(--h) 62% 58%);
  box-shadow: 0 0 0 3px hsl(var(--h) 62% 58% / 0.14);
}

.card:hover {
  border-color: hsl(var(--h) 62% 58% / 0.34);
  box-shadow: var(--shadow-3);
  transform: translateY(-4px);
}

/* 按下时压回去一点，像真的按到实体按钮 */
.card:active {
  transform: translateY(-1px) scale(0.996);
  box-shadow: var(--neu-out-sm);
}

.card-body {
  position: relative;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-name {
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-size: var(--font-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  flex: 0 0 auto;
  padding: 2px 8px;
  border: 1px solid hsl(var(--h) 60% 60% / 0.35);
  border-radius: 999px;
  background: hsl(var(--h) 80% 60% / 0.12);
  color: hsl(var(--h) 55% 45%);
  font-size: var(--font-xs);
}

[data-theme='dark'] .badge {
  color: hsl(var(--h) 70% 78%);
}

.more {
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  color: var(--text-3);
  font-size: 16px;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
}

.card:hover .more {
  opacity: 1;
}

.more:hover {
  background: var(--hover);
  color: var(--text);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 14px;
}

.chip {
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text-2);
  font-size: var(--font-xs);
}

.card-foot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.env {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-3);
  font-size: var(--font-xs);
}

.env-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 0 3px var(--green-soft);
}

.enter {
  color: var(--text-3);
  font-size: var(--font-xs);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.18s, transform 0.18s;
}

.card:hover .enter {
  opacity: 1;
  transform: translateX(0);
  color: var(--accent);
}

.rename {
  flex: 1;
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  background: var(--surface-solid);
  box-shadow: 0 0 0 4px var(--accent-soft);
  font-size: var(--font-md);
}

/* ---- 新建卡片 ---- */
.card.new {
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px dashed var(--border-strong);
  background: transparent;
  color: var(--text-3);
  font-size: var(--font-md);
  /* 凹进去：和凸起的项目卡形成对比，一眼看出这是"空位" */
  box-shadow: var(--neu-in);
}

.card.new:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
  transform: none;
}

.plus {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--surface-solid);
  box-shadow: var(--neu-out-sm);
  color: var(--text-2);
  font-size: 21px;
  font-weight: 300;
  line-height: 1;
  transition: color 0.18s, transform 0.18s, box-shadow 0.18s;
}

.card.new:hover .plus {
  color: var(--accent);
  transform: scale(1.08);
  box-shadow: var(--shadow-2);
}

.card.new.creating {
  gap: 10px;
  padding: 26px;
  border-style: solid;
  border-color: var(--accent);
  background: var(--surface-solid);
  box-shadow: var(--neu-out);
  cursor: default;
}

.new-input {
  width: 100%;
  height: var(--h-ctl);
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--field);
  font-size: var(--font-md);
  text-align: center;
}

.new-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.new-hint {
  font-size: var(--font-xs);
  color: var(--text-3);
}
</style>
