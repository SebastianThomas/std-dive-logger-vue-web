<template>
  <div class="min-h-full flex flex-col py-0 px-0 md:mx-10">
    <div
      class="w-full md:max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 space-y-4"
    >
      <h1 class="text-2xl font-bold">My Tags</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Manage your personal tags. System tags (visible to everyone) cannot be deleted.
      </p>

      <!-- Loading -->
      <div v-if="isLoading" class="text-gray-500">Loading tags…</div>

      <!-- Empty state -->
      <div
        v-else-if="!myTags.length"
        class="text-sm text-gray-400 dark:text-gray-500 italic"
      >
        You have no personal tags yet. Create one from the dive edit page.
      </div>

      <!-- Tag list -->
      <ul v-else class="divide-y divide-gray-100 dark:divide-gray-700">
        <li
          v-for="tag in myTags"
          :key="tag.id"
          class="flex items-center justify-between py-2 gap-3"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span
              class="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium"
              :class="
                tag.autoDetectRule
                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
              "
            >
              {{ tag.name }}
            </span>
            <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">
              {{ tag.diveCount ?? 0 }}
              {{ (tag.diveCount ?? 0) === 1 ? 'dive' : 'dives' }}
            </span>
          </div>

          <button
            v-if="!confirmingId || confirmingId !== tag.id"
            @click="confirmingId = tag.id"
            class="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 shrink-0 transition-colors"
          >
            <i class="fa fa-trash" />
            Delete
          </button>
          <div v-else class="flex items-center gap-2 shrink-0">
            <span class="text-xs text-gray-600 dark:text-gray-300">Are you sure?</span>
            <button
              @click="deleteTag(tag.id)"
              class="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Yes, delete
            </button>
            <button
              @click="confirmingId = null"
              class="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </li>
      </ul>

      <!-- System tags (read-only info) -->
      <details v-if="systemTags.length" class="mt-2">
        <summary class="cursor-pointer text-sm text-gray-500 dark:text-gray-400 select-none">
          System tags ({{ systemTags.length }}) — cannot be deleted
        </summary>
        <div class="flex flex-wrap gap-1.5 mt-2">
          <span
            v-for="tag in systemTags"
            :key="tag.id"
            class="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
          >
            {{ tag.name }}
            <span class="text-gray-400 dark:text-gray-500 ml-1">
              ({{ tag.diveCount ?? 0 }})
            </span>
          </span>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import type { TagDefinition } from '@/lib/types/dive'

const { getWithToken, deleteWithToken } = useApi()

const allTags = ref<TagDefinition[]>([])
const isLoading = ref(true)
const confirmingId = ref<number | null>(null)

const myTags = computed(() => allTags.value.filter((t) => t.userId != null))
const systemTags = computed(() => allTags.value.filter((t) => t.userId == null))

const fetchTags = async () => {
  isLoading.value = true
  try {
    const res = await getWithToken<TagDefinition[]>('/v1/tags')
    allTags.value = res.data ?? []
  } catch (err) {
    console.error(err)
    toast.error('Failed to load tags.')
  } finally {
    isLoading.value = false
  }
}

const deleteTag = async (id: number) => {
  try {
    await deleteWithToken(`/v1/tags/${id}`)
    allTags.value = allTags.value.filter((t) => t.id !== id)
    toast.success('Tag deleted.')
  } catch (err) {
    console.error(err)
    toast.error('Failed to delete tag.')
  } finally {
    confirmingId.value = null
  }
}

onMounted(fetchTags)
</script>
