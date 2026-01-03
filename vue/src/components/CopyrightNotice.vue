<template>
  <div>
    <div class="copyright-notice copyright-notice-background">
      Diver: Sebastian Thomas, Photo:
      <a href="https://diverbydesign.com" target="_blank" rel="noopener noreferrer">Vas Proud</a>
    </div>

    <div class="copyright-notice copyright-notice-hover">
      Diver: Sebastian Thomas, Photo:
      <a href="https://diverbydesign.com" target="_blank" rel="noopener noreferrer">Vas Proud</a>
    </div>
  </div>
</template>

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
  gap: 4px;
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
  opacity: 0.5;
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

.copyright-notice a {
  color: #c7d2fe;
  text-decoration: underline;
}
</style>
