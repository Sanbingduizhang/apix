<script setup lang="ts">
/**
 * JSON 树的一个节点（组件递归调用自己）
 *
 * 值可能是对象、数组，也可能是字符串/数字这类叶子节点，所以先判断类型，再决定怎么画。
 * 默认展开前两层，再深就折叠，避免大响应一屏刷不完。
 */
import { computed, ref } from 'vue'

const props = defineProps<{
  value: unknown
  /** 这一项的键名 */
  name?: string
  /** 键名是不是数组下标（下标不加引号） */
  isIndex?: boolean
  depth?: number
  /** 是不是同级里的最后一个（决定要不要补逗号） */
  last?: boolean
}>()

const open = ref((props.depth ?? 0) < 2)

const isObject = computed(() => props.value !== null && typeof props.value === 'object')
const isArray = computed(() => Array.isArray(props.value))

/** 把对象/数组统一成 [键, 值] 的列表，模板里好写 */
const entries = computed<[string, unknown][]>(() => {
  if (!isObject.value) return []
  if (isArray.value) return (props.value as unknown[]).map((item, i) => [String(i), item])
  return Object.entries(props.value as Record<string, unknown>)
})

const bracket = computed(() => (isArray.value ? ['[', ']'] : ['{', '}']))

/**
 * 要不要在后面补逗号：
 * 根节点（没有键名）不补，同级最后一个也不补。
 */
const showComma = computed(() => props.name !== undefined && !props.last)

/** 叶子节点的类型，用来决定颜色 */
const valueType = computed(() => {
  const v = props.value
  if (v === null) return 'null'
  if (typeof v === 'string') return 'string'
  if (typeof v === 'number') return 'number'
  if (typeof v === 'boolean') return 'boolean'
  return 'other'
})

const text = computed(() => {
  if (valueType.value === 'string') return `"${props.value}"`
  if (valueType.value === 'null') return 'null'
  return String(props.value)
})
</script>

<template>
  <div class="node">
    <div class="line">
      <span v-if="isObject" class="caret" @click="open = !open">{{ open ? '▾' : '▸' }}</span>
      <span v-else class="caret" />

      <template v-if="name !== undefined">
        <span class="key">{{ isIndex ? name : `"${name}"` }}</span>
        <span class="punc">: </span>
      </template>

      <template v-if="isObject">
        <span class="punc">{{ bracket[0] }}</span>
        <span v-if="!open" class="folded" @click="open = true">
          {{ entries.length }} 项 {{ bracket[1] }}<span v-if="showComma">,</span>
        </span>
      </template>
      <template v-else>
        <span class="val" :class="valueType">{{ text }}</span>
        <span v-if="showComma" class="punc">,</span>
      </template>
    </div>

    <div v-if="isObject && open" class="children">
      <JsonNode
        v-for="(entry, i) in entries"
        :key="entry[0]"
        :value="entry[1]"
        :name="entry[0]"
        :is-index="isArray"
        :depth="(depth ?? 0) + 1"
        :last="i === entries.length - 1"
      />
      <div class="line">
        <span class="caret" />
        <span class="punc">{{ bracket[1] }}<span v-if="showComma">,</span></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.node {
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.7;
}

.line {
  display: flex;
  align-items: flex-start;
  white-space: pre-wrap;
  word-break: break-all;
}

.caret {
  flex: 0 0 14px;
  color: var(--text-3);
  cursor: pointer;
  user-select: none;
}

.children {
  margin-left: 5px;
  padding-left: 12px;
  border-left: 1px solid var(--border);
}

.key {
  color: var(--code-key);
}

.punc {
  color: var(--code-punc);
}

.val.string {
  color: var(--green);
}

.val.number {
  color: var(--amber);
}

.val.boolean {
  color: var(--purple);
}

.val.null,
.val.other {
  color: var(--text-3);
}

.folded {
  color: var(--text-3);
  cursor: pointer;
}

.folded:hover {
  color: var(--accent);
}
</style>
