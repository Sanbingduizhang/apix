<script setup lang="ts">
/**
 * 鉴权
 *
 * 只做最常用的四种：无 / Bearer / Basic / API Key。
 * 这四种覆盖了日常调试的绝大部分场景，发送时会自动变成对应的请求头或查询参数。
 */
import { computed } from 'vue'
import type { AuthConfig, AuthType } from '../types'

const props = defineProps<{ auth: AuthConfig }>()

const TYPES: { value: AuthType; label: string }[] = [
  { value: 'none', label: '无需鉴权' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'apikey', label: 'API Key' },
]

/** base64：先用 TextEncoder 转字节，避免中文用户名直接 btoa 报错 */
function base64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/** 这次请求最终会多出什么，直接写出来给人看 */
const preview = computed(() => {
  const auth = props.auth
  if (auth.type === 'bearer') return `Authorization: Bearer ${auth.token || '<token>'}`
  if (auth.type === 'basic') {
    const pair = `${auth.username || '<用户名>'}:${auth.password || '<密码>'}`
    return `Authorization: Basic ${base64(pair)}`
  }
  if (auth.type === 'apikey') {
    const key = auth.key || '<键名>'
    return auth.position === 'header' ? `${key}: ${auth.value || '<值>'}` : `?${key}=${auth.value || '<值>'}`
  }
  return ''
})
</script>

<template>
  <div class="auth">
    <div class="types">
      <button
        v-for="item in TYPES"
        :key="item.value"
        class="type"
        :class="{ on: auth.type === item.value }"
        @click="auth.type = item.value"
      >
        {{ item.label }}
      </button>
    </div>

    <div v-if="auth.type === 'none'" class="tip">这个接口不携带鉴权信息。</div>

    <div v-else-if="auth.type === 'bearer'" class="fields">
      <label class="field wide">
        <span>Token</span>
        <input v-model="auth.token" class="input mono" placeholder="粘贴 token，支持 {{变量}}" spellcheck="false" />
      </label>
    </div>

    <div v-else-if="auth.type === 'basic'" class="fields">
      <label class="field">
        <span>用户名</span>
        <input v-model="auth.username" class="input" placeholder="username" spellcheck="false" />
      </label>
      <label class="field">
        <span>密码</span>
        <input v-model="auth.password" class="input" type="password" placeholder="password" />
      </label>
    </div>

    <template v-else>
      <div class="fields">
        <label class="field">
          <span>键名</span>
          <input v-model="auth.key" class="input mono" placeholder="X-API-Key" spellcheck="false" />
        </label>
        <label class="field">
          <span>值</span>
          <input v-model="auth.value" class="input mono" placeholder="粘贴 key" spellcheck="false" />
        </label>
        <label class="field narrow">
          <span>位置</span>
          <div class="position">
            <button :class="{ on: auth.position === 'header' }" @click="auth.position = 'header'">
              请求头
            </button>
            <button :class="{ on: auth.position === 'query' }" @click="auth.position = 'query'">
              查询参数
            </button>
          </div>
        </label>
      </div>
    </template>

    <p v-if="preview" class="preview">
      <span class="preview-label">发送时会带上</span>
      <code>{{ preview }}</code>
    </p>
  </div>
</template>

<style scoped>
.auth {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 2px;
}

.types {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.type {
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text-2);
  font-size: var(--font-sm);
  transition: color 0.14s, border-color 0.14s, background 0.14s;
}

.type:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.type.on {
  border-color: transparent;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 500;
}

.fields {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 16px;
}

.field {
  display: flex;
  flex: 1 1 200px;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field.wide {
  flex-basis: 100%;
}

.field.narrow {
  flex: 0 0 auto;
}

.field > span {
  color: var(--text-3);
  font-size: var(--font-xs);
}

.input {
  height: var(--h-ctl);
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--field);
  font-size: var(--font-sm);
  transition: border-color 0.14s, background 0.14s, box-shadow 0.14s;
}

.input:focus {
  border-color: var(--accent);
  background: var(--surface-solid);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.mono {
  font-family: var(--mono);
}

.position {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-sm);
  background: var(--neutral-soft);
}

.position button {
  height: 26px;
  padding: 0 12px;
  border-radius: 7px;
  color: var(--text-2);
  font-size: var(--font-sm);
  transition: background 0.14s, color 0.14s, box-shadow 0.14s;
}

.position button.on {
  background: var(--surface-solid);
  box-shadow: var(--shadow-1);
  color: var(--text);
}

.tip {
  color: var(--text-3);
  font-size: var(--font-sm);
}

.preview {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--neutral-soft);
}

.preview-label {
  flex: 0 0 auto;
  color: var(--text-3);
  font-size: var(--font-xs);
}

.preview code {
  overflow: hidden;
  color: var(--code-key);
  font-family: var(--mono);
  font-size: var(--font-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
