<template>
  <div class="min-h-full flex justify-center items-start pt-10 px-4 md:px-8">
    <div class="w-full max-w-2xl">
      <div v-if="loading" class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
        <i class="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
      </div>
      <div
        v-else-if="error"
        class="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-6"
      >
        <p class="text-red-700 dark:text-red-300">{{ error }}</p>
      </div>
      <div v-else-if="site" class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-4">
        <div class="flex items-start justify-between gap-4">
          <h1 class="text-2xl font-bold">{{ site.name }}</h1>
          <button
            v-if="site.canEdit && !editing"
            class="px-3 py-1.5 text-sm bg-blue-600 text-white! rounded hover:bg-blue-700"
            @click="startEditing"
          >
            Edit
          </button>
        </div>

        <router-link
          :to="{ name: 'DiveList', query: { diveSiteId: String(site.id) } }"
          class="text-sm text-blue-600 hover:underline"
        >
          View dives at this site →
        </router-link>

        <template v-if="!editing">
          <p v-if="site.waterType" class="text-sm">
            <span class="font-medium">Water:</span> {{ WATER_TYPE_LABELS[site.waterType] }}
          </p>
          <div
            v-else-if="site.canEdit"
            class="rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/30 p-3 space-y-2"
          >
            <p class="text-sm font-medium">Help improve this site — what water type is it?</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="wt in WATER_TYPES"
                :key="wt"
                type="button"
                :disabled="savingWaterType"
                class="px-2.5 py-1 text-sm rounded border border-sky-300 dark:border-sky-700 hover:bg-sky-100 dark:hover:bg-sky-900 disabled:opacity-50"
                @click="quickSetWaterType(wt)"
              >
                {{ WATER_TYPE_LABELS[wt] }}
              </button>
            </div>
          </div>
          <p v-if="site.type" class="text-sm">
            <span class="font-medium">Type:</span> {{ DIVE_SITE_TYPE_LABELS[site.type] }}
          </p>
          <p v-if="site.countryRegion" class="text-sm">
            <span class="font-medium">Region:</span> {{ site.countryRegion }}
          </p>
          <p v-if="site.maxDepth != null" class="text-sm">
            <span class="font-medium">Max depth:</span> {{ site.maxDepth }} m
          </p>
          <p v-if="site.description" class="text-sm whitespace-pre-wrap">{{ site.description }}</p>
          <div v-if="site.links?.length" class="space-y-1">
            <a
              v-for="(link, idx) in site.links"
              :key="idx"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="block text-sm text-blue-600 hover:underline"
            >
              {{ link.label || link.url }}
            </a>
          </div>
          <p
            v-if="
              !site.type &&
              !site.countryRegion &&
              site.maxDepth == null &&
              !site.description &&
              !site.links?.length
            "
            class="text-sm text-gray-400 italic"
          >
            No additional details yet.{{
              site.canEdit ? ' Click Edit to add some.' : ' Log a dive here to add some.'
            }}
          </p>
        </template>

        <form v-else class="space-y-3" @submit.prevent="save">
          <div>
            <label class="block text-sm font-medium mb-1">Water type <span class="text-red-500">*</span></label>
            <select
              v-model="form.waterType"
              class="w-full rounded border px-2 py-1.5 dark:bg-gray-700"
              required
            >
              <option :value="null" disabled>Select…</option>
              <option v-for="wt in WATER_TYPES" :key="wt" :value="wt">
                {{ WATER_TYPE_LABELS[wt] }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Type</label>
            <select v-model="form.type" class="w-full rounded border px-2 py-1.5 dark:bg-gray-700">
              <option :value="null">—</option>
              <option v-for="(label, key) in DIVE_SITE_TYPE_LABELS" :key="key" :value="key">
                {{ label }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Region / Country</label>
            <input
              v-model="form.countryRegion"
              type="text"
              class="w-full rounded border px-2 py-1.5 dark:bg-gray-700"
              maxlength="128"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Max depth (m)</label>
            <input
              v-model.number="form.maxDepth"
              type="number"
              step="0.1"
              class="w-full rounded border px-2 py-1.5 dark:bg-gray-700"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Description</label>
            <textarea
              v-model="form.description"
              rows="4"
              maxlength="2000"
              class="w-full rounded border px-2 py-1.5 dark:bg-gray-700"
            ></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Links</label>
            <div v-for="(link, idx) in form.links" :key="idx" class="flex gap-2 mb-2">
              <input
                v-model="link.url"
                type="url"
                placeholder="https://..."
                class="flex-1 rounded border px-2 py-1.5 dark:bg-gray-700"
              />
              <input
                v-model="link.label"
                type="text"
                placeholder="Label"
                maxlength="64"
                class="w-32 rounded border px-2 py-1.5 dark:bg-gray-700"
              />
              <button
                type="button"
                class="px-2 text-red-600 hover:text-red-800"
                @click="form.links.splice(idx, 1)"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
            <button
              type="button"
              class="text-sm text-blue-600 hover:underline"
              @click="form.links.push({ url: '', label: '' })"
            >
              + Add link
            </button>
          </div>
          <div class="flex gap-2 pt-2">
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-1.5 bg-blue-600 text-white! rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
            <button
              type="button"
              class="px-4 py-1.5 rounded border"
              @click="editing = false"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import { toast } from 'vue-sonner'
import {
  DIVE_SITE_TYPE_LABELS,
  WATER_TYPE_LABELS,
  WATER_TYPES,
  type DiveSite,
  type DiveSiteType,
  type WaterType,
} from '@/lib/types/dive'

const route = useRoute()
const { getWithToken, putWithToken, postWithToken } = useApi()

const site = ref<DiveSite | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const editing = ref(false)
const saving = ref(false)
const savingWaterType = ref(false)

const form = ref<{
  type: DiveSiteType | null
  waterType: WaterType | null
  countryRegion: string
  maxDepth: number | null
  description: string
  links: { url: string; label: string }[]
}>({
  type: null,
  waterType: null,
  countryRegion: '',
  maxDepth: null,
  description: '',
  links: [],
})

const siteId = () => route.params.siteId as string

const load = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await getWithToken<DiveSite>(`/v1/dives/sites/${siteId()}`)
    site.value = res.data
  } catch {
    error.value = 'Failed to load dive site.'
  } finally {
    loading.value = false
  }
}

const startEditing = () => {
  if (!site.value) return
  form.value = {
    type: site.value.type ?? null,
    waterType: site.value.waterType ?? null,
    countryRegion: site.value.countryRegion ?? '',
    maxDepth: site.value.maxDepth ?? null,
    description: site.value.description ?? '',
    links: (site.value.links ?? []).map((l) => ({ url: l.url, label: l.label ?? '' })),
  }
  editing.value = true
}

const save = async () => {
  if (!form.value.waterType) {
    toast.error('Please pick a water type before saving.')
    return
  }
  saving.value = true
  try {
    const res = await putWithToken<DiveSite>(`/v1/dives/sites/${siteId()}`, {
      description: form.value.description || null,
      countryRegion: form.value.countryRegion || null,
      maxDepth: form.value.maxDepth,
      type: form.value.type,
      waterType: form.value.waterType,
      links: form.value.links
        .filter((l) => l.url.trim())
        .map((l) => ({ url: l.url.trim(), label: l.label.trim() || undefined })),
    })
    site.value = res.data
    editing.value = false
    toast.success('Dive site updated')
  } catch (err) {
    toast.error(`Failed to update dive site: ${extractErrorDetail(err)}`)
  } finally {
    saving.value = false
  }
}

const quickSetWaterType = async (waterType: WaterType) => {
  savingWaterType.value = true
  try {
    const res = await postWithToken<DiveSite>(`/v1/dives/sites/${siteId()}/water-type`, {
      waterType,
    })
    site.value = res.data
    toast.success(`Water type set to ${WATER_TYPE_LABELS[waterType]}. Thanks!`)
  } catch (err) {
    toast.error(`Failed to set the water type: ${extractErrorDetail(err)}`)
  } finally {
    savingWaterType.value = false
  }
}

onMounted(load)
</script>
