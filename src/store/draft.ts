/**
 * 接口草稿
 *
 * 编辑区改的都是草稿，点「保存」才写回项目数据。
 * 但切换接口 / 返回项目列表时会自动保存一次——本地工具，丢改动比"没点保存"更让人恼火。
 */

import { computed, ref, watch } from 'vue'
import type { ApiRequest } from '../types'
import { activeRequest } from './workspace'

/** 深拷贝：草稿必须和项目数据完全脱钩，否则改了草稿就等于改完了 */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** 当前编辑中的接口副本 */
export const draft = ref<ApiRequest | null>(null)

/** 草稿来自哪个接口对象（保存时写回它） */
let owner: ApiRequest | null = null

/** 上一次保存时的内容快照，用来判断"有没有改动" */
const snapshot = ref('')

/** 有未保存的改动 */
export const dirty = computed(() => !!draft.value && JSON.stringify(draft.value) !== snapshot.value)

/** 载入一个接口作为草稿 */
export function loadDraft(request: ApiRequest) {
  owner = request
  draft.value = clone(request)
  snapshot.value = JSON.stringify(draft.value)
}

/** 把草稿写回项目 */
export function saveDraft() {
  const current = draft.value
  if (!current || !owner) return
  current.updatedAt = Date.now()
  Object.assign(owner, clone(current))
  snapshot.value = JSON.stringify(current)
}

/** 丢弃改动，回到已保存的内容 */
export function resetDraft() {
  if (owner) loadDraft(owner)
}

// 接口一换：先把旧草稿存掉，再载入新的
watch(
  () => activeRequest.value?.id,
  () => {
    saveDraft()
    const next = activeRequest.value
    if (next) loadDraft(next)
    else {
      draft.value = null
      owner = null
    }
  },
  { immediate: true },
)
