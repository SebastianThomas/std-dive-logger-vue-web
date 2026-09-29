<template>
  <div
    class="mx-auto max-w-md rounded-xl bg-white bg-opacity-90 shadow-md px-4 py-8 text-center"
    :style="{ color: 'var(--foreground)' }"
  >
    <i class="fa-solid fa-plug-circle-xmark text-3xl opacity-60" aria-hidden="true"></i>
    <h1 class="mt-3 text-lg font-semibold">You're offline</h1>
    <p class="mt-1 text-sm opacity-80">
      Connect to sign in or load your logbook - this page picks up by itself once you're back
      online.
    </p>
  </div>
</template>
