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
        <p v-if="modelValue.diveSite" class="text-sm mt-1 text-gray-600 dark:text-gray-400">
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

      <!-- Notes -->
      <div>
        <label for="notes" class="block mb-2 font-medium">Notes</label>
        <textarea
          id="notes"
          :value="modelValue.notes ?? ''"
          rows="4"
          class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
          placeholder="Add any notes about this dive..."
          @input="updateField('notes', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <!-- Visibility -->
      <fieldset v-if="modelValue.visibility" class="border rounded p-4">
        <legend class="font-medium mb-3">Visibility</legend>
        <div class="space-y-3">
          <div>
            <label for="visibility-feeling" class="block mb-2">Feeling</label>
            <select
              id="visibility-feeling"
              :value="modelValue.visibility.feeling ?? ''"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              @change="updateVisibilityField('feeling', ($event.target as HTMLSelectElement).value)"
            >
              <option value="HIGH">High</option>
              <option value="AVERAGE">Average</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div>
            <label for="visibility-meters" class="block mb-2">Distance (meters)</label>
            <input
              id="visibility-meters"
              :value="modelValue.visibility.meters ?? ''"
              type="number"
              step="0.1"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              placeholder="Optional"
              @input="handleNumberInput('visibility.meters', $event)"
            />
          </div>
          <div>
            <label for="visibility-description" class="block mb-2">Description</label>
            <input
              id="visibility-description"
              :value="modelValue.visibility.description ?? ''"
              type="text"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              placeholder="Optional description"
              @input="updateVisibilityField('description', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </fieldset>

      <!-- Gas Consumption -->
      <fieldset v-if="modelValue.gasConsumption" class="border rounded p-4">
        <legend class="font-medium mb-3">Gas Consumption</legend>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label for="sac-bar" class="block mb-2">SAC (bar/min)</label>
            <input
              id="sac-bar"
              :value="modelValue.gasConsumption.sacBar ?? ''"
              type="number"
              step="0.01"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              @input="handleNumberInput('gasConsumption.sacBar', $event)"
            />
          </div>
          <div>
            <label for="rmv-liters" class="block mb-2">RMV (l/min)</label>
            <input
              id="rmv-liters"
              :value="modelValue.gasConsumption.rmvLiters ?? ''"
              type="number"
              step="0.01"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              @input="handleNumberInput('gasConsumption.rmvLiters', $event)"
            />
          </div>
          <div>
            <label for="total-liters" class="block mb-2">Total Gas (l)</label>
            <input
              id="total-liters"
              :value="modelValue.gasConsumption.totalLiters ?? ''"
              type="number"
              step="0.1"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              @input="handleNumberInput('gasConsumption.totalLiters', $event)"
            />
          </div>
        </div>
      </fieldset>

      <!-- Configuration -->
      <fieldset v-if="modelValue.configuration" class="border rounded p-4 space-y-4">
        <legend class="font-medium mb-3">Configuration</legend>

        <!-- Suit -->
        <div v-if="modelValue.configuration.suit" class="border-t pt-4">
          <h3 class="font-medium mb-3">Suit</h3>
          <div class="space-y-3">
            <div>
              <label for="suit-type" class="block mb-2">Type</label>
              <select
                id="suit-type"
                :value="modelValue.configuration.suit.type ?? ''"
                class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                @change="updateConfigSuitField('type', ($event.target as HTMLSelectElement).value)"
              >
                <option value="NONE">None</option>
                <option value="RASHGUARD">Rashguard</option>
                <option value="THERMOCLINE">Thermocline</option>
                <option value="NEOPRENE">Neoprene</option>
                <option value="MEMBRANE_DRY">Membrane Dry</option>
                <option value="NEOPRENE_DRY">Neoprene Dry</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label for="suit-thickness" class="block mb-2">Thickness (mm)</label>
              <input
                id="suit-thickness"
                :value="modelValue.configuration.suit.thickness ?? ''"
                type="number"
                step="0.5"
                class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                placeholder="Optional"
                @input="handleNumberInput('configuration.suit.thickness', $event)"
              />
            </div>
            <div>
              <label for="suit-notes" class="block mb-2">Notes</label>
              <input
                id="suit-notes"
                :value="modelValue.configuration.suit.notes ?? ''"
                type="text"
                class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                placeholder="Optional"
                @input="updateConfigSuitField('notes', ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
        </div>

        <!-- Base Configuration -->
        <div class="border-t pt-4">
          <div>
            <label for="base-config" class="block mb-2">Base Configuration</label>
            <select
              id="base-config"
              :value="modelValue.configuration.base ?? ''"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              @change="updateConfigField('base', ($event.target as HTMLSelectElement).value)"
            >
              <option value="SINGLE_TANK">Single Tank</option>
              <option value="SINGLE_TANK_AVELO">Single Tank (Avelo)</option>
              <option value="SIDEMOUNT">Sidemount</option>
              <option value="BACKMOUNT_DOUBLES">Backmount Doubles</option>
              <option value="BACKMOUNT_CCR">Backmount CCR</option>
              <option value="SIDEMOUNT_CCR">Sidemount CCR</option>
              <option value="CHESTMOUNT_CCR">Chestmount CCR</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <!-- Weight -->
        <div class="border-t pt-4 space-y-3">
          <div>
            <label for="weight" class="block mb-2">Weight (kg)</label>
            <input
              id="weight"
              :value="modelValue.configuration.weight ?? ''"
              type="number"
              step="0.5"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              @input="handleNumberInput('configuration.weight', $event)"
            />
          </div>
          <div v-if="modelValue.configuration.weightFeeling">
            <label for="weight-feeling" class="block mb-2">Weight Feeling</label>
            <select
              id="weight-feeling"
              :value="modelValue.configuration.weightFeeling ?? ''"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              @change="updateConfigField('weightFeeling', ($event.target as HTMLSelectElement).value)"
            >
              <option value="">None</option>
              <option value="LIGHT">Light</option>
              <option value="GOOD">Good</option>
              <option value="HEAVY">Heavy</option>
            </select>
          </div>
        </div>
      </fieldset>
    </form>

    <!-- Map Modal -->
    <div
      v-if="showMap"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="showMap = false"
    >
      <div
        class="w-[90vw] h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-lg relative overflow-hidden p-4"
      >
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
import { ref, watch } from 'vue'
import DiveSiteMapPicker from '@/components/DiveSiteMapPicker.vue'
import type { DiveSite, Visibility, GasConsumption, DiveConfiguration } from '@/lib/types/dive'

interface DiveFormData {
  diveNumber?: number
  diveName?: string
  diveSite?: DiveSite | null
  diveBuddies?: string[]
  notes?: string
  visibility?: Visibility | null
  gasConsumption?: GasConsumption | null
  configuration?: DiveConfiguration | null
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

// Handle number input to avoid null values being displayed
const handleNumberInput = (path: string, event: Event) => {
  const value = (event.target as HTMLInputElement).value
  const numValue = value === '' ? undefined : Number(value)
  
  // Split path and navigate to the right place
  const parts = path.split('.')
  if (parts.length === 1) {
    // Top-level field like 'notes'
    updateField(parts[0] as keyof DiveFormData, numValue as any)
  } else if (parts[0] === 'visibility') {
    updateVisibilityField(parts[1] as any, numValue)
  } else if (parts[0] === 'gasConsumption') {
    updateGasConsumptionField(parts[1] as any, numValue)
  } else if (parts[0] === 'configuration') {
    if (parts[1] === 'suit') {
      updateConfigSuitField(parts[2] as any, numValue)
    } else {
      updateConfigField(parts[1] as any, numValue)
    }
  }
}

const updateVisibilityField = (field: keyof Visibility, value: any) => {
  emit('update:modelValue', {
    ...props.modelValue,
    visibility: {
      ...props.modelValue.visibility!,
      [field]: value,
    },
  })
}

const updateGasConsumptionField = (field: keyof GasConsumption, value: number | undefined) => {
  emit('update:modelValue', {
    ...props.modelValue,
    gasConsumption: {
      ...props.modelValue.gasConsumption!,
      [field]: value !== undefined ? value : 0,
    },
  })
}

const updateConfigField = (field: string, value: any) => {
  emit('update:modelValue', {
    ...props.modelValue,
    configuration: {
      ...props.modelValue.configuration!,
      [field]: value,
    },
  })
}

const updateConfigSuitField = (field: string, value: any) => {
  if (!props.modelValue.configuration || !props.modelValue.configuration.suit) {
    return
  }
  
  const updatedSuit = {
    ...props.modelValue.configuration.suit,
    [field]: value,
  }
  
  // Ensure notes is always a string, not null or undefined
  if (field !== 'notes' && (updatedSuit.notes === null || updatedSuit.notes === undefined)) {
    updatedSuit.notes = ''
  }
  
  emit('update:modelValue', {
    ...props.modelValue,
    configuration: {
      ...props.modelValue.configuration,
      suit: updatedSuit,
    },
  })
}
</script>
