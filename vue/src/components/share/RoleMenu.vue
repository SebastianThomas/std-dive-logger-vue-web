<template>
  <div class="relative inline-block">
    <button
      class="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm flex items-center gap-2 disabled:opacity-60"
      :disabled="disabled"
      @click="open = !open"
    >
      {{ modelValue }}
      <span class="text-gray-500 text-xs">▼</span>
    </button>
    <div v-if="open" class="absolute z-20 mt-1 w-28 bg-white border border-gray-200 rounded shadow">
      <button
        v-for="role in roles"
        :key="role"
        class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
        :class="{ 'font-semibold': role === modelValue }"
        @click="selectRole(role)"
      >
        {{ role }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const { modelValue, disabled } = defineProps<{ modelValue: string; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const roles = ['ADMIN', 'MEMBER']
const open = ref(false)

function selectRole(role: string) {
  emit('update:modelValue', role)
  open.value = false
}

function onClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.relative.inline-block')) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<style scoped></style>
