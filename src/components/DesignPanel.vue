<script setup lang="ts">
/**
 * 设计态：把接口当成一份文档来写
 *
 * 和调试态一样用页签切换（基本信息 / 查询参数 / 请求头 / 请求体 / 路径变量），
 * 数据是同一份，在哪边改都一样，只是这边更强调"写清楚每个字段是什么意思"。
 */
import { computed, ref } from 'vue'
import type { ApiRequest } from '../types'
import type { VariableHint } from '../store/workspace'
import BodyEditor from './BodyEditor.vue'
import KeyValueEditor from './KeyValueEditor.vue'
import PathEditor from './PathEditor.vue'

const props = defineProps<{ request: ApiRequest; variables: VariableHint[] }>()

type DesignTab = 'basic' | 'params' | 'headers' | 'body' | 'path'
const tab = ref<DesignTab>('basic')

const TABS: { value: DesignTab; label: string }[] = [
  { value: 'basic', label: '基本信息' },
  { value: 'params', label: '查询参数' },
  { value: 'headers', label: '请求头' },
  { value: 'body', label: '请求体' },
  { value: 'path', label: '路径变量' },
]

const TYPES_LABEL: Record<string, string> = {
  none: '无',
  json: 'JSON',
  form: '表单（multipart）',
  urlencoded: 'urlencoded',
  text: '纯文本',
}

/** 页签右侧的数量角标 */
function countOf(item: DesignTab): number {
  const request = props.request
  if (item === 'params') return request.params.filter((row) => row.enabled && row.key.trim()).length
  if (item === 'headers') return request.headers.filter((row) => row.enabled && row.key.trim()).length
  if (item === 'path') return request.pathParams.length
  if (item === 'body') return request.bodyType === 'none' ? 0 : 1
  return 0
}

const bodyTypeLabel = computed(() => TYPES_LABEL[props.request.bodyType] ?? '')
</script>

<template>
  <div class="design">
    <div class="line-tabs">
      <button
        v-for="item in TABS"
        :key="item.value"
        class="line-tab"
        :class="{ on: tab === item.value }"
        @click="tab = item.value"
      >
        {{ item.label }}
        <span v-if="countOf(item.value)" class="count">{{ countOf(item.value) }}</span>
      </button>
    </div>

    <div class="tab-body">
      <!-- 基本信息 -->
      <div v-if="tab === 'basic'" class="basic">
        <div class="row">
          <label class="field grow">
            <span>接口名称</span>
            <input v-model="request.name" class="input" placeholder="比如：获取用户列表" />
          </label>

          <div class="field">
            <span>请求</span>
            <div class="meta">
              <b :class="`m-${request.method}`">{{ request.method }}</b>
              <code>{{ request.url || '还没填地址' }}</code>
            </div>
          </div>
        </div>

        <label class="field">
          <span>接口说明</span>
          <textarea
            v-model="request.desc"
            class="textarea"
            rows="3"
            placeholder="这个接口做什么、有什么注意事项，写给以后接手的人看"
          />
        </label>

        <div class="summary">
          <span>{{ countOf('params') }} 个查询参数</span>
          <span>{{ countOf('headers') }} 个请求头</span>
          <span>请求体：{{ bodyTypeLabel }}</span>
          <span v-if="countOf('path')">{{ countOf('path') }} 个路径变量</span>
        </div>
      </div>

      <!-- 查询参数 -->
      <KeyValueEditor
        v-else-if="tab === 'params'"
        :rows="request.params"
        with-desc
        key-placeholder="参数名"
        value-placeholder="示例值"
      />

      <!-- 请求头 -->
      <KeyValueEditor
        v-else-if="tab === 'headers'"
        :rows="request.headers"
        with-desc
        key-placeholder="键名"
        value-placeholder="示例值"
      />

      <!-- 请求体：和调试态同一个编辑器，所以表单 / JSON / 源码 / 键值都在 -->
      <BodyEditor v-else-if="tab === 'body'" :request="request" :variables="variables" />

      <!-- 路径变量 -->
      <PathEditor v-else :request="request" />
    </div>
  </div>
</template>

<style scoped>
.design {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.tab-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.basic {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.field {
  display: flex;
  flex: 1 1 220px;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field.grow {
  flex: 1 1 280px;
}

.field > span {
  color: var(--text-3);
  font-size: var(--font-xs);
}

.input,
.textarea {
  width: 100%;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-solid);
  font-size: var(--font-sm);
  transition: border-color 0.14s, background 0.14s, box-shadow 0.14s;
}

.input {
  height: var(--h-ctl);
}

.textarea {
  padding: 10px 12px;
  font-family: inherit;
  line-height: 1.7;
  resize: vertical;
}

.input:focus,
.textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  height: var(--h-ctl);
  padding: 0 12px;
  overflow: hidden;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
}

.meta b {
  font-family: var(--mono);
  font-size: var(--font-xs);
  font-weight: 600;
}

.meta code {
  overflow: hidden;
  color: var(--text-2);
  font-family: var(--mono);
  font-size: var(--font-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 4px;
}

.summary span {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--neutral-soft);
  color: var(--text-3);
  font-size: var(--font-xs);
}
</style>
