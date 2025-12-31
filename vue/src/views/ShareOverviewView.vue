<template>
  <div class="h-full">
    <div class="flex justify-center pt-10">
      <main class="bg-white rounded-2xl p-6 max-w-2xl w-full flex flex-col gap-4">
        <div class="flex justify-between">
          <h3 class="text-3xl font-semibold pb-8">Your groups</h3>
          <div class="flex gap-4 items-center pb-8">
            <button
              class="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
              @click="anchorElAdd = $event.currentTarget as HTMLElement"
            >
              ➕ New group
            </button>
            <GroupPopover
              :anchor-el="anchorElAdd"
              @close="anchorElAdd = null"
              @submit="addGroup"
              label="group name"
              type="new"
            />

            <button
              class="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
              @click="anchorElJoin = $event.currentTarget as HTMLElement"
            >
              🔗 Join group
            </button>
            <GroupPopover
              :anchor-el="anchorElJoin"
              @close="anchorElJoin = null"
              @submit="joinGroup"
              label="group name"
              type="join"
            />
          </div>
        </div>
        <ul class="flex flex-col gap-4">
          <li
            v-for="agroup in groups"
            :key="agroup.group.id"
            class="flex justify-between items-center"
          >
            <div class="flex flex-col">
              <p class="text-lg">{{ agroup.group.name }}</p>
              <p class="text-sm text-gray-500">{{ agroup.role }}</p>
            </div>
            <div class="flex gap-2">
              <RouterLink :to="`/share/${agroup.group.id}/edit`">
                <button class="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded" title="edit group">
                  ✏️
                </button>
              </RouterLink>
            </div>
          </li>
        </ul>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import axios from 'axios'
import { useApi } from '@/composables/useApi'
import { type PagedResult } from '@/lib/types/dive'
import { type GroupMember } from '@/lib/types/share'
import GroupPopover from '@/components/GroupPopover.vue'

const { getWithToken, postWithToken } = useApi()
const groups = ref<GroupMember[]>([])
const anchorElAdd = ref<HTMLElement | null>(null)
const anchorElJoin = ref<HTMLElement | null>(null)

const joinGroup = async (groupName: string): Promise<boolean> => {
  try {
    await postWithToken(`/v1/groups/${groupName}/join`, {})
    toast.success('Joined successfully!')
    await fetchGroups()
    return true
  } catch (err: unknown) {
    if (!axios.isAxiosError(err)) {
      console.error(err)
      toast.error('Could not join group')
      return false
    }
    const backendMessage: string = err.response?.data?.detail
    if (backendMessage?.includes('already requested')) {
      toast.warning('You already requested to be a member of this group.')
    } else {
      toast.error('Failed to join group. Please try again.')
    }
    console.error(err)
    return false
  }
}

const addGroup = async (groupName: string): Promise<boolean> => {
  try {
    await postWithToken('/v1/groups', { name: groupName })
    toast.success('Group created successfully!')
    await fetchGroups()
    return true
  } catch (err: unknown) {
    if (!axios.isAxiosError(err)) {
      console.error(err)
      toast.error('Could not create group')
      return false
    }
    const backendMessage: string = err.response?.data?.detail
    if (backendMessage?.includes('A group with this name already exists.')) {
      toast.warning('A group with this name already exists.')
    } else {
      toast.error('Failed to create group. Please try again.')
    }
    console.error(err)
    return false
  }
}

const fetchGroups = async () => {
  try {
    const res = await getWithToken<PagedResult<GroupMember>>('/v1/groups')
    groups.value = res.data.result
  } catch (err: unknown) {
    console.error(err)
  }
}

onMounted(() => {
  fetchGroups()
})
</script>
