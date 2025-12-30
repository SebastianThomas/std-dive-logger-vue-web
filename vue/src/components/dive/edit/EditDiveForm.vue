<template>
  <div>
    <h2 class="text-xl font-semibold mb-4">Dive Information</h2>
    <form class="space-y-4">
      <!-- Dive Number -->
      <div>
        <label for="dive-number" class="block mb-2 font-medium">Dive Number</label>
        <input
          id="dive-number"
          :value="modelValue.diveNumber ?? ''"
          type="number"
          class="w-full p-2 border rounded"
          placeholder="Enter dive number"
          required
          @input="updateField('diveNumber', Number(($event.target as HTMLInputElement).value))"
        />
      </div>

      <!-- Dive Name -->
      <div>
        <label for="dive-name" class="block mb-2 font-medium">Dive Name</label>
        <input
          id="dive-name"
          :value="modelValue.diveName ?? ''"
          type="text"
          class="w-full p-2 border rounded"
          placeholder="Enter name of your dive"
          @input="updateField('diveName', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <!-- Location -->
      <div>
        <label for="site-name" class="block mb-2 font-medium">Location</label>
        <div class="flex gap-2 items-end">
          <input
            id="site-name"
            :value="modelValue.diveSite?.name ?? ''"
            type="text"
            class="flex-1 p-2 border rounded"
            placeholder="Location Name"
            @input="
              updateSite(
                ($event.target as HTMLInputElement).value,
                modelValue.diveSite?.latitude ?? 0,
                modelValue.diveSite?.longitude ?? 0,
              )
            "
          />
          <button
            type="button"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            @click="showMap = true"
          >
            Choose on Map
          </button>
        </div>
        <p v-if="modelValue.diveSite" class="text-sm mt-1 text-gray-600">
          Selected: {{ modelValue.diveSite.latitude.toFixed(5) }},
          {{ modelValue.diveSite.longitude.toFixed(5) }}
        </p>
      </div>

      <!-- Dive Buddies -->
      <div>
        <label for="buddies" class="block mb-2 font-medium">Dive Buddies</label>
        <div class="flex flex-wrap gap-2 mb-2">
          <span
            v-for="buddy in modelValue.diveBuddies || []"
            :key="buddy"
            class="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
          >
            {{ buddy }}
            <button
              type="button"
              class="ml-2 text-red-500 font-bold hover:text-red-700"
              @click="removeBuddy(buddy)"
            >
              ×
            </button>
          </span>
        </div>
        <input
          id="buddies"
          v-model="buddyInput"
          type="text"
          class="w-full p-2 border rounded"
          placeholder="Enter a buddy and press Enter"
          @keydown.enter.prevent="addBuddy"
        />
      </div>
    </form>

    <!-- Map Modal -->
    <div
      v-if="showMap"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="showMap = false"
    >
      <div class="w-[90vw] h-[90vh] bg-white rounded-xl shadow-lg relative overflow-hidden p-4">
        <div class="flex justify-between items-center mb-2">
          <div v-if="selectedCoords" class="text-sm">
            <strong>Selected:</strong> {{ selectedCoords.lat.toFixed(5) }},
            {{ selectedCoords.lon.toFixed(5) }}
          </div>
          <div class="flex gap-2">
            <button
              v-if="selectedCoords"
              class="px-4 py-2 bg-green-600 text-white rounded shadow-md hover:bg-green-700"
              @click="handleMapConfirm"
            >
              Use this location
            </button>
            <button
              class="px-4 py-2 bg-red-500 text-white rounded shadow-md hover:bg-red-600"
              @click="showMap = false"
            >
              Close
            </button>
          </div>
        </div>
        <DiveSiteMapPicker
          :initial-coords="
            modelValue.diveSite
              ? { lat: modelValue.diveSite.latitude, lon: modelValue.diveSite.longitude }
              : undefined
          "
          @select="handleMapClick"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DiveSiteMapPicker from '@/components/DiveSiteMapPicker.vue'
import type { DiveSite } from '@/lib/types/dive'

interface DiveFormData {
  diveNumber?: number
  diveName?: string
  diveSite?: DiveSite | null
  diveBuddies?: string[]
}

const props = defineProps<{
  modelValue: DiveFormData
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DiveFormData]
}>()

const showMap = ref(false)
const buddyInput = ref('')
const selectedCoords = ref<{ lat: number; lon: number } | null>(null)

const updateField = <K extends keyof DiveFormData>(field: K, value: DiveFormData[K]) => {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

const updateSite = (name: string, lat: number, lon: number) => {
  emit('update:modelValue', {
    ...props.modelValue,
    diveSite: { name, latitude: lat, longitude: lon },
  })
}

const handleMapClick = (coords: { lat: number; lon: number }) => {
  selectedCoords.value = coords
}

const handleMapConfirm = () => {
  if (selectedCoords.value) {
    updateSite(
      props.modelValue.diveSite?.name ?? '',
      selectedCoords.value.lat,
      selectedCoords.value.lon,
    )
    showMap.value = false
    selectedCoords.value = null
  }
}

const addBuddy = () => {
  const name = buddyInput.value.trim()
  if (name && !props.modelValue.diveBuddies?.includes(name)) {
    const newBuddies = [...(props.modelValue.diveBuddies || []), name]
    emit('update:modelValue', { ...props.modelValue, diveBuddies: newBuddies })
  }
  buddyInput.value = ''
}

const removeBuddy = (name: string) => {
  const newBuddies = (props.modelValue.diveBuddies || []).filter((b) => b !== name)
  emit('update:modelValue', { ...props.modelValue, diveBuddies: newBuddies })
}
</script>
