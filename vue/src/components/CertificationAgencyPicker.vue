<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium mb-1">Certifying Agency</label>
    <div v-if="selected" class="flex items-center justify-between gap-2">
      <span
        class="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 flex-1 dark:bg-gray-700 dark:text-white"
      >
        {{ selected.name }}
        <span v-if="selected.fullName" class="text-xs text-gray-500 dark:text-gray-400">
          &middot; {{ selected.fullName }}</span
        >
      </span>
      <button
        type="button"
        class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
        @click="clearSelection"
      >
        Change
      </button>
    </div>

    <div v-else class="space-y-2">
      <input
        v-model="searchTerm"
        type="text"
        placeholder="Search agencies (TDI, SSI, ...)"
        class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
        @input="handleSearch"
      />
      <ul
        v-if="results.length > 0"
        class="max-h-40 overflow-y-auto border rounded divide-y dark:divide-gray-700 dark:border-gray-600"
      >
        <li
          v-for="agency in results"
          :key="agency.id"
          class="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
          @click="select(agency)"
        >
          {{ agency.name }}
          <span v-if="agency.fullName" class="text-xs text-gray-500 dark:text-gray-400">
            &middot; {{ agency.fullName }}</span
          >
        </li>
      </ul>
      <p v-else-if="searched && searchTerm.trim()" class="text-sm text-gray-500">
        No matching agency found.
      </p>

      <!-- Deliberately heavier friction than the dive-site "Or create new" flow: adding an agency
           is hidden behind an explicit "isn't listed" confirmation, not just a plain divider, since
           a mistyped duplicate here (e.g. "Tdi" vs "TDI") pollutes a list every diver picks from,
           not just one person's own data. -->
      <button
        v-if="!showAddNew"
        type="button"
        class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
        @click="showAddNew = true"
      >
        My agency isn't listed
      </button>
      <div
        v-else
        class="rounded border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3 space-y-2"
      >
        <p class="text-xs text-amber-900 dark:text-amber-100">
          Only add a new agency if you've searched above and it's genuinely not listed - this list
          is shared by every diver using this app. A short code, full name, and website are all
          required so this can't be used to spam junk entries.
        </p>
        <input
          v-model="newAgency.name"
          type="text"
          placeholder="Short code (e.g. TDI)"
          maxlength="32"
          class="w-full p-2 border rounded dark:bg-gray-800 dark:text-white dark:border-gray-600"
        />
        <input
          v-model="newAgency.fullName"
          type="text"
          placeholder="Full name (e.g. Technical Diving International)"
          maxlength="128"
          class="w-full p-2 border rounded dark:bg-gray-800 dark:text-white dark:border-gray-600"
        />
        <input
          v-model="newAgency.websiteUrl"
          type="url"
          placeholder="Official website (https://...)"
          class="w-full p-2 border rounded dark:bg-gray-800 dark:text-white dark:border-gray-600"
        />
        <textarea
          v-model="newAgency.description"
          rows="2"
          placeholder="Description (optional)"
          maxlength="500"
          class="w-full p-2 border rounded dark:bg-gray-800 dark:text-white dark:border-gray-600"
        ></textarea>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            @click="showAddNew = false"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!canAddNewAgency || adding"
            class="px-3 py-1.5 text-xs rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="addNewAgency"
          >
            {{ adding ? 'Adding...' : 'Add Agency' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import debounce from '@/lib/utils/debounce'
import type { CertificationAgency } from '@/lib/types/user'

// A bare https?://host.tld shape - not full URL validation, just enough to match the backend's
// own @Pattern check and give an early, friendlier error than a failed request.
const URL_LIKE = /^https?:\/\/.+\..+/

const props = defineProps<{
  modelValue: CertificationAgency | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CertificationAgency | null]
}>()

const { getWithToken, postWithToken } = useApi()

const selected = ref<CertificationAgency | null>(props.modelValue)
watch(
  () => props.modelValue,
  (v) => {
    selected.value = v
  },
)

const searchTerm = ref('')
const results = ref<CertificationAgency[]>([])
const searched = ref(false)
const showAddNew = ref(false)
const newAgency = ref({ name: '', fullName: '', websiteUrl: '', description: '' })
const adding = ref(false)

const canAddNewAgency = computed(
  () =>
    newAgency.value.name.trim().length >= 2 &&
    newAgency.value.fullName.trim().length >= 4 &&
    URL_LIKE.test(newAgency.value.websiteUrl.trim()),
)

const doSearch = debounce(async () => {
  try {
    const res = await getWithToken<CertificationAgency[]>(
      `/v1/certifications/agencies?query=${encodeURIComponent(searchTerm.value.trim())}`,
    )
    results.value = res.data ?? []
  } catch (err) {
    console.error('Failed to search certification agencies:', err)
    results.value = []
  } finally {
    searched.value = true
  }
}, 200)

const handleSearch = () => {
  searched.value = false
  doSearch()
}

// Load the full list up front so a first click already shows something to pick from.
getWithToken<CertificationAgency[]>('/v1/certifications/agencies')
  .then((res) => {
    results.value = res.data ?? []
  })
  .catch((err) => console.error('Failed to load certification agencies:', err))

const select = (agency: CertificationAgency) => {
  selected.value = agency
  emit('update:modelValue', agency)
}

const clearSelection = () => {
  selected.value = null
  emit('update:modelValue', null)
}

const addNewAgency = async () => {
  if (!canAddNewAgency.value) return
  adding.value = true
  try {
    const res = await postWithToken<CertificationAgency>('/v1/certifications/agencies', {
      name: newAgency.value.name.trim(),
      fullName: newAgency.value.fullName.trim(),
      websiteUrl: newAgency.value.websiteUrl.trim(),
      description: newAgency.value.description.trim() || null,
    })
    toast.success(`Added agency "${res.data.name}"`)
    newAgency.value = { name: '', fullName: '', websiteUrl: '', description: '' }
    showAddNew.value = false
    select(res.data)
  } catch (err) {
    console.error('Failed to add certification agency:', err)
    toast.error('Failed to add agency - it may already exist under a different spelling.')
  } finally {
    adding.value = false
  }
}
</script>
