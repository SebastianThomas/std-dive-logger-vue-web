<template>
  <div class="bg-white rounded-xl shadow-md p-8 text-center">
    <i :class="`fas fa-${icon} fa-spin text-3xl text-blue-600`"></i>
    <p class="text-sm text-gray-500 mt-3">{{ currentMessage }}</p>
    <div class="mt-4 h-1.5 w-full max-w-xs mx-auto rounded-full bg-gray-100 overflow-hidden">
      <div class="loading-progress-fill h-full w-1/3 rounded-full bg-blue-600"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Rotates through these while mounted - pass a few for a bit of personality. */
    messages?: string[]
    intervalMs?: number
    /** FontAwesome solid icon name, without the `fa-` prefix. */
    icon?: string
  }>(),
  {
    messages: () => ['Crunching the numbers…', 'Warming up the algorithm…', 'Almost there…'],
    intervalMs: 2200,
    icon: 'circle-notch',
  },
)

const messageIndex = ref(0)
const currentMessage = computed(
  () => props.messages[messageIndex.value % props.messages.length] ?? '',
)

let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  if (props.messages.length <= 1) return
  timer = setInterval(() => {
    messageIndex.value += 1
  }, props.intervalMs)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<style scoped>
.loading-progress-fill {
  animation: loading-progress-slide 1.4s ease-in-out infinite;
}

@keyframes loading-progress-slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(300%);
  }
}
</style>
