<template>
  <div>
    <CopyrightNoticeContent class="copyright-notice copyright-notice-background" />
    <CopyrightNoticeContent class="copyright-notice copyright-notice-hover" />
  </div>
</template>

<script setup lang="ts">
import CopyrightNoticeContent from './CopyrightNoticeContent.vue'
</script>

<style scoped>
/* Shared copyright notice styles */
.copyright-notice {
  position: fixed;
  right: 14px;
  bottom: 12px;
  color: #e5e7eb;
  font-size: 0.75rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  display: flex;
  gap: 0;
  align-items: center;
  pointer-events: auto;
  padding: 8px 12px;
  border: 1px solid rgba(229, 231, 235, 0.3);
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

/* Background notice - always visible, lower z-index */
.copyright-notice-background {
  z-index: 5;
  opacity: 0.2;
}

/* Hover notice - appears on hover, higher z-index */
.copyright-notice-hover {
  z-index: 50;
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
}

.copyright-notice-hover:hover {
  opacity: 1;
}
</style>
