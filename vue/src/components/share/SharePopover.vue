<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    @click.self="emit('close')"
  >
    <div class="dive-card bg-white rounded-xl shadow-lg flex flex-col w-full max-w-md max-h-[70vh]">
      <!-- Header -->
      <div class="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <button
          v-if="view !== 'overview'"
          @click="view = 'overview'"
          class="p-1 hover:bg-gray-100 rounded"
        >
          ←
        </button>
        <span class="font-medium text-sm">
          {{ viewTitle }}
        </span>
      </div>

      <!-- Body (scrollable) -->
      <div class="flex-1 overflow-y-auto px-4 py-3">
        <!-- Overview -->
        <div v-if="view === 'overview'" class="space-y-4">
          <!-- People Section -->
          <section>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-gray-600">People</span>
              <button
                @click="view = 'add-person'"
                class="p-1 hover:bg-gray-100 rounded text-blue-600"
              >
                +
              </button>
            </div>
            <ul class="space-y-1">
              <li
                v-for="person in readers"
                :key="person.id"
                class="flex justify-between items-center py-1"
              >
                <span class="text-sm">{{ person.name }}</span>
                <button
                  @click="deletePerson(person.id)"
                  class="p-1 hover:bg-gray-100 rounded text-red-600"
                >
                  ×
                </button>
              </li>
              <li v-if="readers.length === 0" class="text-sm text-gray-400">No people shared</li>
            </ul>
          </section>

          <!-- Groups Section -->
          <section>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-gray-600">Groups</span>
              <button
                @click="view = 'add-group'"
                class="p-1 hover:bg-gray-100 rounded text-blue-600"
              >
                +
              </button>
            </div>
            <ul class="space-y-1">
              <li
                v-for="group in groupReaders"
                :key="group.id"
                class="flex justify-between items-center py-1"
              >
                <span class="text-sm">{{ group.name }}</span>
                <button
                  @click="deleteGroup(group.id)"
                  class="p-1 hover:bg-gray-100 rounded text-red-600"
                >
                  ×
                </button>
              </li>
              <li v-if="groupReaders.length === 0" class="text-sm text-gray-400">
                No groups shared
              </li>
            </ul>
          </section>
        </div>

        <!-- Add Person -->
        <form
          v-else-if="view === 'add-person'"
          @submit.prevent="handleAddPerson"
          class="flex flex-col gap-4"
        >
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium">Enter username</label>
            <input
              v-model="personInput"
              type="text"
              placeholder="Username..."
              class="border rounded-lg p-2"
              autofocus
            />
          </div>
          <button
            type="submit"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add buddy
          </button>
        </form>

        <!-- Add Group -->
        <form
          v-else-if="view === 'add-group'"
          @submit.prevent="handleAddGroup"
          class="flex flex-col gap-4"
        >
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium">Enter group name</label>
            <input
              v-model="groupInput"
              type="text"
              placeholder="Group name..."
              class="border rounded-lg p-2"
              autofocus
            />
          </div>
          <button
            type="submit"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add group
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import type { User, Group } from '@/lib/types/share'
import type { PagedResult } from '@/lib/types/dive'

const props = defineProps<{
  open: boolean
  diveId: number | undefined
}>()

const emit = defineEmits<{
  close: []
}>()

type View = 'overview' | 'add-person' | 'add-group'

const view = ref<View>('overview')
const readers = ref<User[]>([])
const groupReaders = ref<Group[]>([])
const personInput = ref('')
const groupInput = ref('')

const { getWithToken, postWithToken, deleteWithToken } = useApi()

const viewTitle = computed(() => {
  switch (view.value) {
    case 'overview':
      return 'Dive shared with'
    case 'add-person':
      return 'Add person'
    case 'add-group':
      return 'Add group'
    default:
      return '' // ESLint
  }
})

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      view.value = 'overview'
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

const handleAddPerson = async () => {
  if (props.diveId == null || !personInput.value.trim()) return
  try {
    await postWithToken(`/v1/dives/${props.diveId}/readers`, [personInput.value])
    toast.success('Added person')
    personInput.value = ''
    view.value = 'overview'
    await fetchAllReaders()
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
    view.value = 'overview'
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
