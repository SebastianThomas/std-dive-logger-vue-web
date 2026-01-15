<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    @click.self="emit('close')"
  >
    <div
      class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-lg flex flex-col w-full max-w-md max-h-[70vh]"
    >
      <!-- Header -->
      <div class="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <span class="font-medium text-sm"> Dive shared with </span>
      </div>

      <!-- Body (scrollable) -->
      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <!-- People Section -->
        <section>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-400">People</span>
            <button
              @click="showAddPersonForm = !showAddPersonForm"
              class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-blue-600"
            >
              +
            </button>
          </div>

          <!-- Add Person Form (inline) -->
          <form
            v-if="showAddPersonForm"
            @submit.prevent="handleAddPerson"
            class="flex flex-col gap-3 mb-3 pb-3 border-b"
          >
            <AutocompleteInput
              suburl="user"
              label="Search for a user"
              @selected="selectedPerson = $event"
              @enter="handleAddPerson"
              @escape="personEscape"
            />
            <div class="flex gap-2">
              <button
                type="submit"
                :disabled="!selectedPerson"
                class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm"
              >
                Add buddy
              </button>
              <button
                type="button"
                @click="personCancel"
                class="flex-1 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 px-3 py-2 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </form>

          <ul class="space-y-1">
            <li
              v-for="person in displayedReaders"
              :key="person.id"
              class="flex justify-between items-center py-1"
            >
              <span class="text-sm">{{ person.name }}</span>
              <button
                @click="deletePerson(person.id)"
                class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-red-600"
              >
                ×
              </button>
            </li>
            <li
              v-if="displayedReaders.length === 0"
              class="text-sm text-gray-400 dark:text-gray-500"
            >
              No people shared
            </li>
          </ul>
        </section>

        <!-- Groups Section -->
        <section>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-400">Groups</span>
            <button
              @click="showAddGroupForm = !showAddGroupForm"
              class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-blue-600"
            >
              +
            </button>
          </div>

          <!-- Add Group Form (inline) -->
          <form
            v-if="showAddGroupForm"
            @submit.prevent="handleAddGroup"
            class="flex flex-col gap-3 mb-3 pb-3 border-b"
          >
            <input
              v-model="groupInput"
              type="text"
              @keydown.enter="handleAddGroup"
              @keydown.escape="
                showAddGroupForm = false,
                groupInput = ''
              "
              placeholder="Group name..."
              class="border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              autofocus
            />
            <div class="flex gap-2">
              <button
                type="submit"
                class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
              >
                Add group
              </button>
              <button
                type="button"
                @click="
                  showAddGroupForm = false,
                  groupInput = ''
                "
                class="flex-1 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 px-3 py-2 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </form>

          <ul class="space-y-1">
            <li
              v-for="group in groupReaders"
              :key="group.id"
              class="flex justify-between items-center py-1"
            >
              <span class="text-sm">{{ group.name }}</span>
              <button
                @click="deleteGroup(group.id)"
                class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-red-600"
              >
                ×
              </button>
            </li>
            <li v-if="groupReaders.length === 0" class="text-sm text-gray-400 dark:text-gray-500">
              No groups shared
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import AutocompleteInput from '@/components/AutocompleteInput.vue'
import type { User, Group } from '@/lib/types/user'
import type { PagedResult } from '@/lib/types/dive'

const props = defineProps<{
  open: boolean
  diveId: number | undefined
  diveUserId: number | undefined
}>()

const emit = defineEmits<{
  close: []
}>()

const readers = ref<User[]>([])
const groupReaders = ref<Group[]>([])
const groupInput = ref('')
const selectedPerson = ref<User | null>(null)
const showAddPersonForm = ref(false)
const showAddGroupForm = ref(false)

const { getWithToken, postWithToken, deleteWithToken } = useApi()

const displayedReaders = computed(() => {
  return readers.value.filter((reader) => reader.id !== props.diveUserId)
})

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      showAddPersonForm.value = false
      showAddGroupForm.value = false
      await fetchAllReaders()
    }
  },
)

const fetchAllReaders = async () => {
  if (props.diveId == null) return

  try {
    const [readersRes, groupsRes] = await Promise.all([
      getWithToken<PagedResult<User>>(`/v1/dives/${props.diveId}/readers`),
      getWithToken<Group[]>(`/v1/dives/${props.diveId}/group-readers`),
    ])
    readers.value = readersRes.data.result
    groupReaders.value = groupsRes.data
  } catch (err) {
    console.error('Failed to fetch readers', err)
  }
}

const deletePerson = async (id: number) => {
  if (props.diveId == null) return
  try {
    await deleteWithToken(`/v1/dives/${props.diveId}/readers`, [id])
    toast.success('Removed person')
    await fetchAllReaders()
  } catch (err) {
    toast.error('Failed to remove person')
    console.error(err)
  }
}

const deleteGroup = async (id: number | undefined) => {
  if (props.diveId == null || id == null) return
  try {
    await deleteWithToken(`/v1/dives/${props.diveId}/group-readers?groupId=${id}`)
    toast.success('Removed group')
    await fetchAllReaders()
  } catch (err) {
    toast.error('Failed to remove group')
    console.error(err)
  }
}

const personEscape = () => {
  showAddPersonForm.value = false
  selectedPerson.value = null
}
const personCancel = () => {
  showAddPersonForm.value = false
  selectedPerson.value = null
}

const handleAddPerson = async () => {
  if (props.diveId == null || !selectedPerson.value) return
  try {
    const res = await postWithToken<PagedResult<User>>(`/v1/dives/${props.diveId}/readers`, [
      selectedPerson.value.id,
    ])
    readers.value = res.data.result
    toast.success('Added person')
    selectedPerson.value = null
    showAddPersonForm.value = false
  } catch (err) {
    toast.error('Failed to add person')
    console.error(err)
  }
}

const handleAddGroup = async () => {
  if (props.diveId == null || !groupInput.value.trim()) return
  try {
    await postWithToken(`/v1/dives/${props.diveId}/group-readers`, groupInput.value)
    toast.success('Added group')
    groupInput.value = ''
    showAddGroupForm.value = false
    await fetchAllReaders()
  } catch (err) {
    toast.error('Failed to add group')
    console.error(err)
  }
}
</script>

<style scoped>
.dive-card {
  background-color: var(--card-bg);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
}

[data-theme='dark'] .dive-card {
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}
</style>
