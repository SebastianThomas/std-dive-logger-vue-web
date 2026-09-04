<template>
  <div v-if="visible.length" class="space-y-2">
    <div
      v-for="r in visible"
      :key="r.id"
      class="dtl-reminder flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border p-3"
      :class="`dtl-reminder--${tone(r.kind)}`"
    >
      <RouterLink
        v-if="r.diveId"
        :to="{ name: 'DiveView', params: { diveId: r.diveId } }"
        class="group min-w-0"
      >
        <p class="text-sm font-semibold group-hover:underline">
          <i :class="[icon(r.kind), 'mr-1.5']" aria-hidden="true"></i>{{ r.title }}
        </p>
        <p class="text-xs opacity-90">{{ r.body }}</p>
      </RouterLink>
      <div v-else class="min-w-0">
        <p class="text-sm font-semibold">
          <i :class="[icon(r.kind), 'mr-1.5']" aria-hidden="true"></i>{{ r.title }}
        </p>
        <p class="text-xs opacity-90">{{ r.body }}</p>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <RouterLink
          v-if="r.kind === 'DIVE_AGAIN_NUDGE'"
          :to="{ name: 'MapView' }"
          class="rounded-lg bg-amber-600 px-3 py-1 text-sm text-white hover:bg-amber-700"
        >
          Find your next site →
        </RouterLink>
        <button
          type="button"
          class="dtl-reminder__dismiss px-1 text-sm opacity-60 hover:opacity-100"
          title="Dismiss"
          :disabled="pending.has(r.id)"
          @click="dismiss(r)"
        >
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import type { DiverReminder, ReminderKind } from '@/lib/types/home'

const props = defineProps<{ reminders: DiverReminder[] }>()

const { postWithToken } = useApi()

// Locally hide a reminder the moment it's dismissed, without waiting for a home refetch.
const dismissedLocally = ref<Set<number>>(new Set())
const pending = ref<Set<number>>(new Set())

const visible = computed(() =>
  props.reminders.filter((r) => !dismissedLocally.value.has(r.id)),
)

const tone = (k: ReminderKind) => (k === 'DIVE_AGAIN_NUDGE' ? 'amber' : 'indigo')
const icon = (k: ReminderKind) =>
  k === 'DIVE_AGAIN_NUDGE' ? 'fa-solid fa-water' : 'fa-regular fa-calendar-check'

const dismiss = async (r: DiverReminder) => {
  pending.value.add(r.id)
  try {
    await postWithToken(`/v1/reminders/${r.id}/dismiss`)
    dismissedLocally.value = new Set([...dismissedLocally.value, r.id])
  } catch (err) {
    toast.error(`Couldn't dismiss that: ${extractErrorDetail(err)}`)
  } finally {
    pending.value.delete(r.id)
  }
}
</script>

<style>
/* Themed by [data-theme] rather than the `dark:` variant, which tracks prefers-color-scheme
   here, not the app's manual toggle (see src/styles/global.css). */
.dtl-reminder--amber {
  border-color: #fcd34d;
  background: #fffbeb;
  color: #78350f;
}
.dtl-reminder--indigo {
  border-color: #c7d2fe;
  background: #eef2ff;
  color: #3730a3;
}
[data-theme='dark'] .dtl-reminder--amber {
  border-color: #b45309;
  background: rgba(120, 53, 15, 0.25);
  color: #fde68a;
}
[data-theme='dark'] .dtl-reminder--indigo {
  border-color: #4338ca;
  background: rgba(49, 46, 129, 0.3);
  color: #c7d2fe;
}
</style>
