<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <h3 class="text-lg font-semibold">Certifications</h3>
      <button
        v-if="!readOnly"
        type="button"
        class="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
        @click="openCreateModal"
      >
        Add Certification
      </button>
    </div>

    <p v-if="loading" class="text-sm text-gray-600 dark:text-gray-400">Loading certifications...</p>
    <p v-else-if="certifications.length === 0" class="text-sm text-gray-600 dark:text-gray-400">
      No certifications yet.
    </p>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div
        v-for="cert in certifications"
        :key="cert.id"
        class="border dark:border-gray-600 rounded-lg p-4"
      >
        <div class="flex justify-between items-start gap-2">
          <div>
            <p class="font-semibold">
              <a
                v-if="cert.agency.websiteUrl"
                :href="cert.agency.websiteUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="hover:underline"
                >{{ cert.agency.name }}</a
              >
              <span v-else>{{ cert.agency.name }}</span>
              &middot; {{ cert.level }}
            </p>
            <p class="text-xs text-gray-600 dark:text-gray-400">{{ cert.certDate }}</p>
          </div>
          <div v-if="!readOnly" class="flex gap-2 shrink-0">
            <button
              type="button"
              class="px-2 py-1 text-xs rounded border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              @click="editCertification(cert)"
            >
              Edit
            </button>
            <button
              type="button"
              class="px-2 py-1 text-xs rounded border border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
              @click="deleteCertification(cert)"
            >
              Delete
            </button>
          </div>
        </div>
        <div class="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
          <p v-if="cert.certId">ID: {{ cert.certId }}</p>
          <p v-if="cert.instructorName">Instructor: {{ cert.instructorName }}</p>
          <p v-if="cert.facility">Facility: {{ cert.facility }}</p>
          <p v-if="cert.courseLink">
            <a
              :href="cert.courseLink"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:underline"
              >Course link</a
            >
          </p>
          <p v-if="cert.certificationLink">
            <a
              :href="cert.certificationLink"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:underline"
              >Certification link</a
            >
          </p>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      @click.self="closeModal"
    >
      <div class="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
        <h4 class="text-lg font-semibold">
          {{ modalMode === 'create' ? 'Add Certification' : 'Edit Certification' }}
        </h4>

        <CertificationAgencyPicker v-model="form.agency" />

        <div>
          <label class="block text-sm font-medium mb-1">Level</label>
          <input
            v-model="form.level"
            type="text"
            placeholder="e.g. Open Water Diver"
            class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Date</label>
          <input
            v-model="form.certDate"
            type="date"
            class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Certification ID (optional)</label>
          <input
            v-model="form.certId"
            type="text"
            class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Instructor (optional)</label>
          <input
            v-model="form.instructorName"
            type="text"
            class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Facility (optional)</label>
          <input
            v-model="form.facility"
            type="text"
            class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Course Link (optional)</label>
          <input
            v-model="form.courseLink"
            type="url"
            class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Certification Link (optional)</label>
          <input
            v-model="form.certificationLink"
            type="url"
            class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="closeModal"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!canSave || saving"
            class="px-4 py-2 rounded text-white transition-colors bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            @click="saveCertification"
          >
            {{ saving ? 'Saving...' : modalMode === 'create' ? 'Create' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import { useReadOnlyMode } from '@/composables/useReadOnlyMode'
import CertificationAgencyPicker from '@/components/CertificationAgencyPicker.vue'
import type { Certification, CertificationAgency } from '@/lib/types/user'

const { getWithToken, postWithToken, putWithToken, deleteWithToken } = useApi()
const { readOnly } = useReadOnlyMode()

const certifications = ref<Certification[]>([])
const loading = ref(false)

const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const saving = ref(false)
const editingId = ref<number | null>(null)

const emptyForm = () => ({
  agency: null as CertificationAgency | null,
  level: '',
  certDate: '',
  certId: '',
  instructorName: '',
  facility: '',
  courseLink: '',
  certificationLink: '',
})

const form = ref(emptyForm())

const canSave = computed(
  () => !!form.value.agency && form.value.level.trim().length > 0 && !!form.value.certDate,
)

const loadCertifications = async () => {
  loading.value = true
  try {
    const res = await getWithToken<Certification[]>('/v1/certifications')
    certifications.value = res.data ?? []
  } catch (err) {
    console.error('Failed to load certifications:', err)
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  modalMode.value = 'create'
  editingId.value = null
  form.value = emptyForm()
  showModal.value = true
}

const editCertification = (cert: Certification) => {
  modalMode.value = 'edit'
  editingId.value = cert.id
  form.value = {
    agency: cert.agency,
    level: cert.level,
    certDate: cert.certDate,
    certId: cert.certId ?? '',
    instructorName: cert.instructorName ?? '',
    facility: cert.facility ?? '',
    courseLink: cert.courseLink ?? '',
    certificationLink: cert.certificationLink ?? '',
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const saveCertification = async () => {
  if (!canSave.value || !form.value.agency) return
  saving.value = true
  const body = {
    agencyId: form.value.agency.id,
    level: form.value.level.trim(),
    certDate: form.value.certDate,
    certId: form.value.certId.trim() || null,
    instructorName: form.value.instructorName.trim() || null,
    facility: form.value.facility.trim() || null,
    courseLink: form.value.courseLink.trim() || null,
    certificationLink: form.value.certificationLink.trim() || null,
  }
  try {
    if (modalMode.value === 'create') {
      await postWithToken('/v1/certifications', body)
      toast.success('Certification added')
    } else {
      await putWithToken(`/v1/certifications/${editingId.value}`, body)
      toast.success('Certification updated')
    }
    closeModal()
    await loadCertifications()
  } catch (err) {
    console.error('Failed to save certification:', err)
    toast.error(`Failed to save certification: ${extractErrorDetail(err)}`)
  } finally {
    saving.value = false
  }
}

const deleteCertification = async (cert: Certification) => {
  try {
    await deleteWithToken(`/v1/certifications/${cert.id}`)
    toast.success('Certification deleted')
    await loadCertifications()
  } catch (err) {
    console.error('Failed to delete certification:', err)
    toast.error(`Failed to delete certification: ${extractErrorDetail(err)}`)
  }
}

loadCertifications()
</script>
