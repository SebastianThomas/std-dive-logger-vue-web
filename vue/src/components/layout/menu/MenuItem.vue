<template>
  <div
    role="menuitem"
    :tabindex="disabled ? -1 : 0"
    :aria-disabled="disabled"
    :title="disabled ? disabledTitle : undefined"
    @click="handleClick"
    @keydown="handleKeyDown"
    class="menu-item flex items-center gap-4 px-4 py-2 transition-all duration-300"
    :class="disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'"
  >
    <i :class="`fa fa-${icon} text-white text-lg`"></i>
    <span v-if="isVisible" class="text-white text-sm font-medium">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon: string
  text: string
  isVisible: boolean
  disabled?: boolean
  disabledTitle?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  action: []
}>()

const handleClick = () => {
  if (props.disabled) return
  emit('action')
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (props.disabled) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('action')
  }
}
</script>

<style scoped>
.menu-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

[data-theme='light'] .menu-item:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .menu-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) .menu-item:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

@media (prefers-color-scheme: light) {
  :root:not([data-theme]) .menu-item:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
}
</style>
