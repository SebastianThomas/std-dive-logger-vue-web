<template>
  <div class="bg-sky-100 text-black flex w-screen h-[calc(100vh-70px)]">
    <div class="w-full h-full flex justify-center items-center">
      <article class="max-w-md w-full">
        <header class="mb-6">
          <h1 class="text-black text-4xl font-bold">Upload a Dive</h1>
        </header>

        <main>
          <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
            <!-- Dive Number -->
            <div class="flex flex-col rounded-lg">
              <label for="dive-number" class="font-medium">Dive Number</label>
              <input
                id="dive-number"
                v-model.number="diveNumber"
                type="number"
                class="pl-3 py-2 rounded-lg border"
                placeholder="Enter dive number"
                required
              />
            </div>

            <!-- Identifier -->
            <div class="flex flex-col rounded-lg">
              <label for="dive-name" class="font-medium">Dive Name</label>
              <input
                id="dive-name"
                v-model="identifier"
                type="text"
                class="pl-3 py-2 rounded-lg border"
                placeholder="Enter Name"
              />
            </div>

            <!-- Dive Site ID -->
            <div class="flex flex-col rounded-lg">
              <label for="site-id" class="font-medium">Dive Site ID</label>
              <div class="flex items-center gap-2 mb-2">
                <CreateDiveSite @created="(site) => (siteId = site.id)" />
              </div>
              <input
                id="site-id"
                v-model.number="siteId"
                type="number"
                class="pl-3 py-2 rounded-lg border"
                placeholder="Enter dive site"
              />
            </div>

            <!-- File Input -->
            <div class="flex flex-col gap-1">
              <label for="file-input" class="font-medium">Dive File</label>

              <button
                type="button"
                class="border-2 border-dashed border-sky-300 bg-sky-50 dark:bg-sky-900 dark:border-sky-600 rounded-2xl p-6 text-center cursor-pointer shadow-sm transition hover:bg-sky-100 dark:hover:bg-sky-800 hover:border-sky-400 dark:hover:border-sky-500"
                @click="fileInputRef?.click()"
                @dragover.prevent
                @drop.prevent="handleDrop"
              >
                <div class="text-sky-500 dark:text-sky-400 text-4xl mb-2">☁️📤</div>

                <p class="text-gray-700 dark:text-gray-200">
                  <span v-if="file" class="font-semibold">{{ file.name }}</span>
                  <span v-else>
                    <span class="font-semibold">Click to upload</span> or drag & drop
                  </span>
                </p>

                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Supported file types: Any</p>
              </button>

              <!-- Hidden file input -->
              <input
                ref="fileInputRef"
                type="file"
                class="hidden"
                @change="(e) => (file = (e.target as HTMLInputElement).files?.[0] || null)"
              />
            </div>

            <!-- Submit -->
            <div class="flex gap-2">
              <button
                type="submit"
                class="flex-1 text-black bg-sky-300 rounded-lg py-2 px-4 cursor-pointer hover:bg-sky-400 font-medium"
              >
                Upload
              </button>
              <RouterLink :to="{ name: 'Home' }">
                <button
                  type="button"
                  class="flex-1 text-black bg-gray-300 rounded-lg py-2 px-4 cursor-pointer hover:bg-gray-400 font-medium"
                >
                  Cancel
                </button>
              </RouterLink>
            </div>

            <!-- Status -->
            <p
              v-if="status"
              :class="{
                'text-green-600': status.includes('complete'),
                'text-red-600': status.includes('Error'),
              }"
            >
              {{ status }}
            </p>
          </form>
        </main>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import CreateDiveSite from '@/components/CreateDiveSite.vue'

const { postWithToken } = useApi()
const file = ref<File | null>(null)
const diveNumber = ref<number | undefined>()
const identifier = ref('')
const siteId = ref<number | undefined>()
const status = ref('')
const fileInputRef = ref<HTMLInputElement>()

const handleDrop = (e: DragEvent) => {
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    const dropped = e.dataTransfer.files[0]
    if (dropped) file.value = dropped
  }
}

const handleSubmit = async () => {
  status.value = ''

  if (!file.value) {
    status.value = 'Please select a file.'
    return
  }

  try {
    const formData = new FormData()
    const body = {
      diveNumber: diveNumber.value ?? 1,
      diveIdentifier: identifier.value,
      diveSiteId: siteId.value ?? 0,
    }
    const bodyBlob = new Blob([JSON.stringify(body)], {
      type: 'application/json',
    })
    formData.append('uploadBody', bodyBlob)
    formData.append('file', file.value)

    await postWithToken('/v1/dives/upload', formData)
    status.value = 'Upload complete!'
    file.value = null
    diveNumber.value = undefined
    identifier.value = ''
    siteId.value = undefined
  } catch (err) {
    console.error(err)
    status.value = 'Error: ' + (err as Error).message
  }
}
</script>

<style scoped>
/* Hide number input arrows */
:deep(input[type='number'])::-webkit-outer-spin-button,
:deep(input[type='number'])::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

:deep(input[type='number']) {
  -moz-appearance: textfield;
}
</style>
