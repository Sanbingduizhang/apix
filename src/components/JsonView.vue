<script setup lang="ts">
/**
 * 响应体展示：能解析成 JSON 就画成可折叠的树，否则按纯文本显示。
 */
import { computed } from 'vue'
import JsonNode from './JsonNode.vue'

const props = defineProps<{ text: string }>()

const result = computed(() => {
  const trimmed = props.text.trim()
  if (!trimmed) return { isJson: false, data: null as unknown }
  try {
    return { isJson: true, data: JSON.parse(trimmed) }
  } catch {
    return { isJson: false, data: null }
  }
})
</script>

<template>
  <JsonNode v-if="result.isJson" :value="result.data" />
  <pre v-else class="raw">{{ text }}</pre>
</template>

<style scoped>
.raw {
  margin: 0;
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text);
}
</style>
