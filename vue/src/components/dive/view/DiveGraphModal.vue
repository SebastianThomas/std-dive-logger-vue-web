<template>
  <DiveGraphContainer :profiles="profiles" :dive-id="diveId" fullscreen @close="emit('close')" />
</template>

<script setup lang="ts">
import DiveGraphContainer from '@/components/dive/view/DiveGraphContainer.vue'
import type { DiveProfile } from '@/lib/types/dive'

defineProps<{ profiles: DiveProfile[]; diveId: number }>()

const emit = defineEmits<{ close: [] }>()
</script>
