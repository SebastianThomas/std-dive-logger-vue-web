<template>
  <div
    class="flex justify-center items-start pt-20 px-6 md:mx-10"
    :style="{ minHeight: 'calc(100vh - 80px)' }"
  >
    <main class="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-3xl w-full flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Edit Group</h1>
      <p class="text-gray-600 dark:text-gray-400">Group ID: {{ groupId }}</p>

      <section>
        <h3 class="font-semibold mb-2">Members</h3>
        <table class="w-full text-sm border border-gray-200 dark:border-gray-700 rounded">
          <tbody>
            <tr
              v-for="member in users"
              :key="member.id"
              class="border-b last:border-none dark:border-gray-700"
            >
              <td class="px-3 py-2 font-medium">{{ member.name }}</td>
              <td class="px-3 py-2">
                <RoleMenu
                  v-model="member.role"
                  :disabled="!isAdmin"
                  @update:modelValue="(role) => changeRole(member.id, role)"
                />
              </td>
            </tr>
            <tr v-if="!users.length">
              <td class="px-3 py-2 text-gray-400 dark:text-gray-500">No members found.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="isAdmin">
        <h3 class="font-semibold mb-2">Join Requests</h3>
        <table class="w-full text-sm border border-gray-200 dark:border-gray-700 rounded">
          <tbody>
            <tr
              v-for="req in requests"
              :key="req.id"
              class="border-b last:border-none dark:border-gray-700"
            >
              <td class="px-3 py-2 font-medium">{{ req.name }}</td>
              <td class="px-3 py-2 flex gap-2">
                <button
                  class="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                  @click="acceptRequest(req.id)"
                >
                  Accept
                </button>
                <button
                  class="px-3 py-1 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-600"
                  @click="declineRequest(req.id)"
                >
                  Decline
                </button>
              </td>
            </tr>
            <tr v-if="!requests.length">
              <td class="px-3 py-2 text-gray-400">No pending requests.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import RoleMenu from '@/components/share/RoleMenu.vue'
import type { GroupRequest, GroupWithMembers, User, UserWithRole } from '@/lib/types/share'

const route = useRoute()
const groupId = computed(() => Number(route.params.groupId))

const { getWithToken, putWithToken } = useApi()
const users = ref<UserWithRole[]>([])
const requests = ref<User[]>([])
const isAdmin = ref(false)
const error = ref('')

const fetchJoinRequests = async () => {
  try {
    const res = await getWithToken<GroupRequest[]>('/v1/groups/requests')
    requests.value = res.data.map(({ user }) => user)
  } catch (err) {
    console.error(err)
  }
}

const fetchGroupDetails = async () => {
  if (!groupId.value) return
  try {
    const res = await getWithToken<GroupWithMembers>(`/v1/groups/${groupId.value}/members`)
    const merged: UserWithRole[] = [
      ...res.data.members.map((m) => ({ ...m, role: 'MEMBER' as const })),
      ...res.data.admins.map((m) => ({ ...m, role: 'ADMIN' as const })),
    ].sort((a, b) => a.name.localeCompare(b.name))
    users.value = merged

    const firstAdmin = merged.find((u) => u.role === 'ADMIN')
    if (firstAdmin) {
      try {
        await putWithToken(
          `/v1/groups/role?id=${groupId.value}&userId=${firstAdmin.id}&role=ADMIN`,
          {},
        )
        isAdmin.value = true
      } catch (err) {
        console.error(err)
        isAdmin.value = false
      }
    }
  } catch (err) {
    console.error(err)
    error.value = 'Could not load group members.'
  }
}

const changeRole = async (userId: number, role: string) => {
  try {
    await putWithToken(`/v1/groups/role?id=${groupId.value}&userId=${userId}&role=${role}`, {})
    await fetchGroupDetails()
  } catch (err) {
    console.error(err)
    error.value = 'Failed to change role.'
  }
}

const acceptRequest = async (userId: number) => {
  try {
    await putWithToken(`/v1/groups/role?id=${groupId.value}&userId=${userId}&role=MEMBER`, {})
    await fetchJoinRequests()
  } catch (err) {
    console.error(err)
    error.value = 'Failed to accept request.'
  }
}

const declineRequest = async (userId: number) => {
  try {
    await putWithToken(`/v1/groups/role?id=${groupId.value}&userId=${userId}&role=DENIED`, {})
    await fetchJoinRequests()
  } catch (err) {
    console.error(err)
    error.value = 'Failed to decline request.'
  }
}

onMounted(() => {
  fetchGroupDetails()
  fetchJoinRequests()
})
</script>
