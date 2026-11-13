<script setup lang="ts">
/**
 * 带语法高亮的文本框（零依赖）
 *
 * 做法很朴素：底下铺一层同样字体、同样排版的 <pre>，把着色后的 HTML 画上去；
 * 上面盖一个背景透明的 textarea 负责输入和光标，两边滚动位置同步。
 * 这样不用引 CodeMirror/Monaco，包体和启动速度都不受影响，逻辑也就几十行。
 */
import { computed, nextTick, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    /** json 会着色，text 就是纯文本 */
    language?: 'json' | 'text'
    placeholder?: string
    readonly?: boolean
  }>(),
  { language: 'text', placeholder: '', readonly: false },
)

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const area = ref<HTMLTextAreaElement | null>(null)
const pre = ref<HTMLElement | null>(null)

/** 先转义，后面拼的 span 才是唯一的安全标签 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * JSON 着色：字符串（区分键名）、数字、true/false/null、标点。
 * 这里不做严格语法检查，边打字边着色才顺手。
 */
function highlightJson(text: string): string {
  return escapeHtml(text).replace(
    /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    (match: string, str?: string, colon?: string, literal?: string) => {
      if (str) {
        return colon
          ? `<span class="tok-key">${str}</span><span class="tok-punc">${colon}</span>`
          : `<span class="tok-str">${str}</span>`
      }
      if (literal) return `<span class="tok-lit">${literal}</span>`
      return `<span class="tok-num">${match}</span>`
    },
  )
}

const highlighted = computed(() => {
  const text = props.modelValue ?? ''
  const body = props.language === 'json' ? highlightJson(text) : escapeHtml(text)
  // 末尾补一个换行，否则最后一行是空行时高度会差一行
  return `${body}\n`
})

/** 输入时同步给父组件 */
function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}

/** 两层滚动同步：textarea 滚多少，高亮层就跟多少 */
function onScroll() {
  if (area.value && pre.value) {
    pre.value.scrollTop = area.value.scrollTop
    pre.value.scrollLeft = area.value.scrollLeft
  }
}

/** Tab 键插入两个空格，别把焦点跳走 */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  event.preventDefault()
  const el = area.value
  if (!el) return

  const start = el.selectionStart
  const end = el.selectionEnd
  const next = `${props.modelValue.slice(0, start)}  ${props.modelValue.slice(end)}`
  emit('update:modelValue', next)

  nextTick(() => {
    el.selectionStart = el.selectionEnd = start + 2
  })
}
</script>

<template>
  <div class="code">
    <pre ref="pre" class="layer highlight" aria-hidden="true"><code v-html="highlighted" /></pre>

    <textarea
      ref="area"
      class="layer input"
      :value="modelValue"
      :placeholder="placeholder"
      :readonly="readonly"
      spellcheck="false"
      autocomplete="off"
      autocapitalize="off"
      @input="onInput"
      @scroll="onScroll"
      @keydown="onKeydown"
    />
  </div>
</template>

<style scoped>
.code {
  position: relative;
  flex: 1;
  /* 别把最小高度定太大，否则在矮一点的编辑区里会把内容顶出卡片 */
  min-height: 80px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--field);
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.code:focus-within {
  border-color: var(--accent);
  background: var(--surface-solid);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

/* 两层必须完全同款排版，否则光标和文字会错位 */
.layer {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 12px 14px;
  border: none;
  font-family: var(--mono);
  font-size: var(--font-sm);
  line-height: 1.75;
  white-space: pre;
  overflow: auto;
  tab-size: 2;
}

.highlight {
  color: var(--text);
  pointer-events: none;
}

.highlight code {
  font: inherit;
  white-space: inherit;
}

.input {
  background: transparent;
  /* 文字透明、只留光标：真正的字是下面那层高亮层画的 */
  color: transparent;
  caret-color: var(--text);
  resize: none;
  outline: none;
}

.input::placeholder {
  color: var(--text-3);
}

.input::selection {
  background: rgba(79, 107, 255, 0.26);
}
</style>
