<script setup lang="ts">
/**
 * 设计态：把接口当成一份文档来写
 *
 * 名称、说明、以及各处字段的描述都在这里填。表格和调试态共用同一份数据，
 * 在哪边改都一样，只是这边更强调"写清楚每个字段是什么意思"。
 */
import { computed } from 'vue'
import type { ApiRequest } from '../types'
import KeyValueEditor from './KeyValueEditor.vue'

const props = defineProps<{ request: ApiRequest }>()

/** 请求体是不是按行填的（form / urlencoded / json 的键值模式） */
const hasBodyRows = computed(() => {
  const request = props.request
  return (
    request.bodyType === 'form' ||
    request.bodyType === 'urlencoded' ||
    (request.bodyType === 'json' && request.bodyMode === 'rows')
  )
})

const bodyLabel = computed(() => {
  const type = props.request.bodyType
  if (type === 'form') return '表单字段'
  if (type === 'urlencoded') return '表单字段'
  if (type === 'json') return '请求体字段'
  return ''
})
</script>

<template>
  <div class="design">
    <div class="head">
      <label class="field name">
        <span>接口名称</span>
        <input v-model="request.name" class="input" placeholder="比如：获取用户列表" />
      </label>

      <div class="field meta">
        <span>请求</span>
        <div class="meta-value">
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

    <section class="block">
      <p class="title">查询参数<span>发送时拼在地址后面</span></p>
      <KeyValueEditor
        :rows="request.params"
        with-desc
        key-placeholder="参数名"
        value-placeholder="示例值"
      />
    </section>

    <section v-if="request.pathParams.length" class="block">
      <p class="title">路径变量<span>来自地址里的 :name</span></p>
      <KeyValueEditor
        :rows="request.pathParams"
        with-desc
        key-placeholder="变量"
        value-placeholder="示例值"
      />
    </section>

    <section class="block">
      <p class="title">请求头</p>
      <KeyValueEditor
        :rows="request.headers"
        with-desc
        key-placeholder="键名"
        value-placeholder="示例值"
      />
    </section>

    <section v-if="hasBodyRows" class="block">
      <p class="title">{{ bodyLabel }}</p>
      <KeyValueEditor
        :rows="request.rows"
        with-desc
        key-placeholder="字段名"
        value-placeholder="示例值"
      />
    </section>
  </div>
</template>

<style scoped>
.design {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.head {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field > span {
  color: var(--text-3);
  font-size: var(--font-xs);
}

.field.name {
  flex: 1 1 260px;
}

.field.meta {
  flex: 1 1 240px;
}

.input,
.textarea {
  width: 100%;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--field);
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
  background: var(--surface-solid);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.meta-value {
  display: flex;
  align-items: center;
  gap: 8px;
  height: var(--h-ctl);
  padding: 0 12px;
  overflow: hidden;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
}

.meta-value b {
  font-family: var(--mono);
  font-size: var(--font-xs);
  font-weight: 600;
}

.meta-value code {
  overflow: hidden;
  color: var(--text-2);
  font-family: var(--mono);
  font-size: var(--font-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.block {
  padding-top: 12px;
  border-top: 1px dashed var(--border);
}

.title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 6px 4px;
  color: var(--text-2);
  font-size: var(--font-sm);
  font-weight: 500;
}

.title span {
  color: var(--text-3);
  font-size: var(--font-xs);
  font-weight: 400;
}
</style>
