<template>
  <DiveSiteMap :sites="sites" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DiveSiteMap from '@/components/DiveSiteMap.vue'
import { useApi } from '@/composables/useApi'
import type { SiteWithDives } from '@/lib/types/dive'

const sites = ref<SiteWithDives[]>([])
const { getWithToken } = useApi()

onMounted(async () => {
  try {
    const res = await getWithToken<SiteWithDives[]>('/v1/dives/sites')
    sites.value = res.data
  } catch (err) {
    console.error(err)
  }
})
</script>
