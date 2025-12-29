<template>
  <div>
    <button
      v-if="!hideTrigger"
      class="px-4 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700"
      @click="open = true"
    >
      Add Dive Site
    </button>

    <div v-if="open" class="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div class="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md">
        <h2 class="text-xl font-semibold mb-4">Create New Dive Site</h2>

        <div class="flex flex-col gap-4">
          <div>
            <label for="site-name" class="block mb-1">Name</label>
            <input
              id="site-name"
              v-model="siteName"
              type="text"
              class="border rounded-lg p-2 w-full"
              required
            />
          </div>

          <div>
            <label for="latitude" class="block mb-1">Latitude</label>
            <input
              id="latitude"
              v-model="latitude"
              type="number"
              step="any"
              class="border rounded-lg p-2 w-full"
              required
            />
          </div>

          <div>
            <label for="longitude" class="block mb-1">Longitude</label>
            <input
              id="longitude"
              v-model="longitude"
              type="number"
              step="any"
              class="border rounded-lg p-2 w-full"
              required
            />
          </div>

          <p v-if="status" class="text-red-600 text-sm">{{ status }}</p>

          <div class="flex gap-2 justify-end">
            <button
              type="button"
              class="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              @click="closeModal"
            >
              Cancel
            </button>
            <button
              type="button"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              @click="handleCreateDiveSite"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useApi } from '@/composables/useApi'
import { type DiveSite } from '@/lib/types/dive'

interface Props {
  onCreated?: (data: DiveSite) => void
  autoOpen?: boolean
  initialName?: string
  hideTrigger?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoOpen: false,
  initialName: '',
  hideTrigger: false,
})

const emit = defineEmits<{
  created: [data: DiveSite]
  close: []
}>()

const { postWithToken } = useApi()
const open = ref(false)
const siteName = ref(props.initialName ?? '')
const latitude = ref('')
const longitude = ref('')
const status = ref('')

watch(
  () => props.initialName,
  (val) => {
    if (val) siteName.value = val
  },
  { immediate: true },
)

watch(
  () => props.autoOpen,
  (val) => {
    if (val) open.value = true
  },
  { immediate: true },
)

const closeModal = () => {
  open.value = false
  emit('close')
}

const handleCreateDiveSite = async () => {
  status.value = ''

  if (!siteName.value || !latitude.value || !longitude.value) {
    status.value = 'Please fill in all fields.'
    return
  }

  try {
    const body = {
      name: siteName.value,
      lat: Number(latitude.value),
      lon: Number(longitude.value),
    }

    const res = await postWithToken<DiveSite>('/v1/dives/sites', body)
    const data = res.data
    status.value = 'Dive site created successfully!'

    if (props.onCreated) {
      props.onCreated(data)
    }
    emit('created', data)

    closeModal()
  } catch (err) {
    console.error(err)
    status.value = 'Error: ' + (err as Error).message
  }
}
</script>
