<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <h3 class="text-lg font-semibold">My Dive Buddies</h3>
      <button
        type="button"
        class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        @click="loadAll"
        :disabled="loading"
      >
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <p v-if="loading" class="text-sm text-gray-600 dark:text-gray-400">Loading buddies...</p>

    <!-- Named buddies -->
    <div>
      <h4 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Named Buddies</h4>
      <p v-if="!loading && buddies.length === 0" class="text-sm text-gray-600 dark:text-gray-400">
        No named dive buddies yet.
      </p>
      <ul
        v-else-if="buddies.length"
        class="divide-y divide-gray-200 dark:divide-gray-700 border dark:border-gray-600 rounded-lg"
      >
        <li
          v-for="name in buddies"
          :key="name"
          class="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
        >
          <div>
            <span>{{ name }}</span>
            <span
              v-if="namedDefaults[name]"
              class="ml-2 text-xs text-gray-500 dark:text-gray-400"
            >
              (default: {{ BUDDY_ROLE_LABELS[namedDefaults[name]] }})
            </span>
          </div>
          <div v-if="!readOnly" class="flex items-center gap-2">
            <select
              v-model="namedRoleSelections[name]"
              class="text-xs p-1 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
            >
              <option value="">No role</option>
              <option v-for="(label, role) in BUDDY_ROLE_LABELS" :key="role" :value="role">
                {{ label }}
              </option>
            </select>
            <button
              type="button"
              class="px-2 py-1 text-xs rounded border border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors whitespace-nowrap"
              :disabled="applyingNamedRole === name"
              @click="applyNamedRole(name)"
            >
              {{ applyingNamedRole === name ? 'Applying...' : 'Apply to all dives' }}
            </button>
            <button
              type="button"
              class="px-2 py-1 text-xs rounded border border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors whitespace-nowrap"
              :disabled="savingNamedDefault === name"
              @click="saveNamedDefault(name)"
            >
              {{ savingNamedDefault === name ? 'Saving...' : 'Save as default' }}
            </button>
            <button
              type="button"
              class="px-2 py-1 text-xs rounded border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              @click="openRenameModal(name)"
            >
              Rename
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Linked buddies -->
    <div>
      <h4 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Linked Buddies</h4>
      <p
        v-if="!loading && linkedBuddies.length === 0"
        class="text-sm text-gray-600 dark:text-gray-400"
      >
        No linked dive buddies yet.
      </p>
      <ul
        v-else-if="linkedBuddies.length"
        class="divide-y divide-gray-200 dark:divide-gray-700 border dark:border-gray-600 rounded-lg"
      >
        <li
          v-for="buddy in linkedBuddies"
          :key="buddy.id"
          class="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
        >
          <div>
            <span>{{ buddy.name }}</span>
            <span
              v-if="linkedDefaultLabel(buddy.id)"
              class="ml-2 text-xs text-gray-500 dark:text-gray-400"
            >
              (default: {{ linkedDefaultLabel(buddy.id) }})
            </span>
          </div>
          <div v-if="!readOnly" class="flex items-center gap-2">
            <select
              v-model="linkedRoleSelections[buddy.id]"
              class="text-xs p-1 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
            >
              <option value="">No role</option>
              <option v-for="(label, role) in BUDDY_ROLE_LABELS" :key="role" :value="role">
                {{ label }}
              </option>
            </select>
            <button
              type="button"
              class="px-2 py-1 text-xs rounded border border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors whitespace-nowrap"
              :disabled="applyingLinkedRole === buddy.id"
              @click="applyLinkedRole(buddy)"
            >
              {{ applyingLinkedRole === buddy.id ? 'Applying...' : 'Apply to all dives' }}
            </button>
            <button
              type="button"
              class="px-2 py-1 text-xs rounded border border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors whitespace-nowrap"
              :disabled="savingLinkedDefault === buddy.id"
              @click="saveLinkedDefault(buddy)"
            >
              {{ savingLinkedDefault === buddy.id ? 'Saving...' : 'Save as default' }}
            </button>
          </div>
        </li>
      </ul>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Sets this buddy's role as rated from your own side, across every dive you've linked with
        them - it does not change how they rate you.
      </p>
    </div>

    <!-- Rename Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="closeModal"
    >
      <div class="w-[90vw] max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h4 class="text-lg font-semibold mb-2">Rename Buddy</h4>
        <p class="text-xs text-gray-600 dark:text-gray-400 mb-4">
          Renames "{{ renamingFrom }}" on every one of your dives. If a dive already lists the new
          name too, the duplicate entry on that dive is dropped instead of duplicated.
        </p>
        <input
          type="text"
          class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 mb-4"
          v-model="newName"
          placeholder="New name"
          @keydown.enter="saveRename"
        />
        <div v-if="error" class="text-sm text-red-600 mb-4">{{ error }}</div>
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
            :disabled="saving || !canSave"
            :class="[
              'px-4 py-2 rounded text-white transition-colors',
              saving || !canSave ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700',
            ]"
            @click="saveRename"
          >
            {{ saving ? 'Saving...' : 'Save' }}
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
import { BUDDY_ROLE_LABELS, type BuddyRole, type DiveBuddyDefaultRole } from '@/lib/types/dive'
import type { User } from '@/lib/types/user'

const { getWithToken, putWithToken } = useApi()
const { readOnly } = useReadOnlyMode()

const buddies = ref<string[]>([])
const linkedBuddies = ref<User[]>([])
const loading = ref(false)

const namedRoleSelections = ref<Record<string, BuddyRole | ''>>({})
const linkedRoleSelections = ref<Record<number, BuddyRole | ''>>({})
const applyingNamedRole = ref<string | null>(null)
const applyingLinkedRole = ref<number | null>(null)

const namedDefaults = ref<Record<string, BuddyRole>>({})
const linkedDefaults = ref<Record<number, BuddyRole>>({})
const savingNamedDefault = ref<string | null>(null)
const savingLinkedDefault = ref<number | null>(null)

const linkedDefaultLabel = (buddyId: number): string => {
  const role = linkedDefaults.value[buddyId]
  return role ? BUDDY_ROLE_LABELS[role] : ''
}

const showModal = ref(false)
const renamingFrom = ref('')
const newName = ref('')
const saving = ref(false)
const error = ref('')

const canSave = computed(() => newName.value.trim().length > 0)

const loadAll = async () => {
  loading.value = true
  try {
    const [namedRes, linkedRes, defaultsRes] = await Promise.all([
      getWithToken<string[]>('/v1/dives/buddies'),
      getWithToken<User[]>('/v1/dives/buddies/users'),
      getWithToken<DiveBuddyDefaultRole[]>('/v1/dives/buddies/default-roles'),
    ])
    buddies.value = namedRes.data ?? []
    linkedBuddies.value = linkedRes.data ?? []

    const named: Record<string, BuddyRole> = {}
    const linked: Record<number, BuddyRole> = {}
    for (const d of defaultsRes.data ?? []) {
      if (d.buddyName) named[d.buddyName] = d.role
      else if (d.buddyUser) linked[d.buddyUser.id] = d.role
    }
    namedDefaults.value = named
    linkedDefaults.value = linked
    // Prefill each row's role picker with its saved default, if any, so it's clear what's
    // currently saved and "Apply to all dives" can reuse it without re-selecting.
    for (const name of buddies.value) {
      namedRoleSelections.value[name] = named[name] ?? namedRoleSelections.value[name] ?? ''
    }
    for (const buddy of linkedBuddies.value) {
      linkedRoleSelections.value[buddy.id] =
        linked[buddy.id] ?? linkedRoleSelections.value[buddy.id] ?? ''
    }
  } catch (err) {
    console.error('Failed to load buddies:', err)
  } finally {
    loading.value = false
  }
}

const saveNamedDefault = async (name: string) => {
  const role = namedRoleSelections.value[name] || null
  savingNamedDefault.value = name
  try {
    await putWithToken(`/v1/dives/buddies/${encodeURIComponent(name)}/default-role`, { role })
    if (role) {
      namedDefaults.value = { ...namedDefaults.value, [name]: role }
    } else {
      const rest = { ...namedDefaults.value }
      delete rest[name]
      namedDefaults.value = rest
    }
    toast.success(
      role
        ? `"${name}" will default to ${BUDDY_ROLE_LABELS[role]} on future dives`
        : `Cleared "${name}"'s default role`,
    )
  } catch (err) {
    console.error('Failed to save named buddy default role:', err)
    toast.error(`Failed to save default: ${extractErrorDetail(err)}`)
  } finally {
    savingNamedDefault.value = null
  }
}

const saveLinkedDefault = async (buddy: User) => {
  const role = linkedRoleSelections.value[buddy.id] || null
  savingLinkedDefault.value = buddy.id
  try {
    await putWithToken(`/v1/dives/buddies/users/${buddy.id}/default-role`, { role })
    if (role) {
      linkedDefaults.value = { ...linkedDefaults.value, [buddy.id]: role }
    } else {
      const rest = { ...linkedDefaults.value }
      delete rest[buddy.id]
      linkedDefaults.value = rest
    }
    toast.success(
      role
        ? `"${buddy.name}" will default to ${BUDDY_ROLE_LABELS[role]} on future dives`
        : `Cleared "${buddy.name}"'s default role`,
    )
  } catch (err) {
    console.error('Failed to save linked buddy default role:', err)
    toast.error(`Failed to save default: ${extractErrorDetail(err)}`)
  } finally {
    savingLinkedDefault.value = null
  }
}

const applyNamedRole = async (name: string) => {
  const role = namedRoleSelections.value[name] || null
  applyingNamedRole.value = name
  try {
    await putWithToken(`/v1/dives/buddies/${encodeURIComponent(name)}/role`, { role })
    toast.success(`Updated "${name}"'s role across your dives`)
  } catch (err) {
    console.error('Failed to set named buddy role:', err)
    toast.error(`Failed to update role: ${extractErrorDetail(err)}`)
  } finally {
    applyingNamedRole.value = null
  }
}

const applyLinkedRole = async (buddy: User) => {
  const role = linkedRoleSelections.value[buddy.id] || null
  applyingLinkedRole.value = buddy.id
  try {
    await putWithToken(`/v1/dives/buddies/users/${buddy.id}/role`, { role })
    toast.success(`Updated "${buddy.name}"'s role across your dives`)
  } catch (err) {
    console.error('Failed to set linked buddy role:', err)
    toast.error(`Failed to update role: ${extractErrorDetail(err)}`)
  } finally {
    applyingLinkedRole.value = null
  }
}

const openRenameModal = (name: string) => {
  renamingFrom.value = name
  newName.value = name
  error.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const saveRename = async () => {
  if (!canSave.value) return
  const trimmed = newName.value.trim()
  if (trimmed === renamingFrom.value) {
    closeModal()
    return
  }
  saving.value = true
  error.value = ''
  try {
    const res = await putWithToken<string[], { oldName: string; newName: string }>(
      '/v1/dives/buddies/rename',
      { oldName: renamingFrom.value, newName: trimmed },
    )
    buddies.value = res.data ?? []
    toast.success(`Renamed "${renamingFrom.value}" to "${trimmed}" across your dives`)
    closeModal()
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to rename buddy'
    console.error('Rename error:', err)
  } finally {
    saving.value = false
  }
}

loadAll()
</script>
