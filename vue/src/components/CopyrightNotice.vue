<template>
  <div class="copyright-notice copyright-notice-hover">
    Diver:&ThinSpace;
    <a href="https://instagram.com/sthomas_ch" target="_blank" rel="noopener noreferrer"
      >Sebastian Thomas</a
    >, Photo:&ThinSpace;
    <a href="https://diverbydesign.com" target="_blank" rel="noopener noreferrer">Vas Proud</a>
  </div>
</template>

<script setup lang="ts"></script>

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
  /* The badge is a fixed overlay sitting on top of scrollable page content, so it must never
     swallow taps: only the two credit links are real pointer targets (see the rule below). */
  pointer-events: none;
  padding: 8px 12px;
  border: 1px solid rgba(229, 231, 235, 0.3);
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

/* Faint at rest, fully opaque while a credit link is hovered.
   The resting z-index must stay ABOVE App.vue's `.router-content` (z-index: 10), a sibling in the
   same stacking context: underneath it the router content covered the links, so they could only
   be reached in whatever corner the page content happened not to cover. Raising it is safe only
   because the container itself is pointer-events: none - otherwise a fixed, near-full-width badge
   would block real controls behind it on a narrow screen (it overlapped a button at 320px). */
.copyright-notice-hover {
  z-index: 11;
  opacity: 0.2;
  transition: all 0.3s ease-in-out;
}

/* :has(a:hover) is what actually fires - the container takes no pointer events of its own. */
.copyright-notice-hover:hover,
.copyright-notice-hover:has(a:hover) {
  z-index: 20;
  opacity: 1;
}

.copyright-notice a {
  color: #c7d2fe;
  text-decoration: underline;
  pointer-events: auto;
}
</style>
