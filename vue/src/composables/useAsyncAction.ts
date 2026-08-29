import { ref, shallowRef, computed, type Ref, type ComputedRef } from 'vue'

/**
 * Wraps an async handler so its trigger can show a busy state and can't be double-fired.
 * `run(fn)` no-ops while already busy, flips `busy` for the duration, and re-throws so the caller
 * keeps its own `try/catch` + toast.
 *
 *   const { run, busy } = useAsyncAction()
 *   const save = () => run(async () => { await putWithToken(...) })
 *   <AsyncButton :loading="busy" @click="save" label="Save" />
 */
export function useAsyncAction(): {
  busy: Ref<boolean>
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>
} {
  const busy = ref(false)
  const run = async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (busy.value) return undefined
    busy.value = true
    try {
      return await fn()
    } finally {
      busy.value = false
    }
  }
  return { busy, run }
}

/**
 * Per-key variant for lists (one busy flag per row id). `isBusy(id)` for the template,
 * `run(id, fn)` to invoke. A key clears itself when its call settles.
 */
export function useAsyncActionSet<K = string | number>(): {
  isBusy: (key: K) => boolean
  anyBusy: ComputedRef<boolean>
  run: <T>(key: K, fn: () => Promise<T>) => Promise<T | undefined>
} {
  const keys = shallowRef<Set<K>>(new Set())
  const isBusy = (key: K) => keys.value.has(key)
  const anyBusy = computed(() => keys.value.size > 0)
  const run = async <T>(key: K, fn: () => Promise<T>): Promise<T | undefined> => {
    if (keys.value.has(key)) return undefined
    keys.value = new Set(keys.value).add(key)
    try {
      return await fn()
    } finally {
      const next = new Set(keys.value)
      next.delete(key)
      keys.value = next
    }
  }
  return { isBusy, anyBusy, run }
}
