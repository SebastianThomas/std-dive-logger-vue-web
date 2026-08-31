<template>
  <div class="space-y-6 md:space-y-8">
    <!-- Hero -->
    <section class="text-center text-white space-y-3">
      <h1 class="text-2xl md:text-4xl font-bold">Your dive log, properly analysed</h1>
      <p class="mx-auto max-w-2xl text-sm md:text-base text-white/80">
        Upload your dive computer files and get profile graphs, gas-consumption analytics,
        buddy tracking, trips, sites and a photo gallery — shared exactly how you want.
      </p>
      <div class="flex flex-wrap justify-center gap-2">
        <RouterLink
          :to="{ name: 'AuthSignup' }"
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Sign up free
        </RouterLink>
        <RouterLink
          :to="{ name: 'AuthLogin' }"
          class="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/25"
        >
          Sign in
        </RouterLink>
      </div>
      <p v-if="countsLine" class="text-xs text-white/60">{{ countsLine }}</p>
    </section>

    <!-- Feature cards -->
    <div class="flex flex-wrap gap-4 md:gap-6 justify-center">
      <FeatureCard
        v-for="(feature, index) in features"
        :key="index + '-feature-card'"
        :feature="feature"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { resolveUrl } from '@/lib/globals/url/resolveUrl'
import { type FeatureCardProps } from '@/lib/types/feature'
import FeatureCard from '@/components/FeatureCard.vue'

const features: FeatureCardProps[] = [
  {
    image: '/images/analyze1.png',
    title: 'Analyze your dives',
    description:
      'Detailed profile graphs, ascent-rate warnings, deco, gas consumption and per-cylinder RMV — from a single uploaded file.',
  },
  {
    image: '/images/group.jpg',
    title: 'Share your dives',
    description:
      'Per-dive or per-group sharing, separate from trips. Plan a holiday together or just show off a favourite dive.',
  },
  {
    image: '/images/merge.png',
    title: 'Combine profiles',
    description:
      'Merge several computers’ recordings of the same dive into one clean continuous profile.',
  },
]

const diveCount = ref<number | null>(null)
const userCount = ref<number | null>(null)

const countsLine = computed(() => {
  const u = userCount.value
  const d = diveCount.value
  if (u == null || d == null) return ''
  return `${u} ${u === 1 ? 'diver' : 'divers'} · ${d} ${d === 1 ? 'dive' : 'dives'} logged`
})

onMounted(async () => {
  // Public, unauthenticated - deliberately raw axios (no bearer token needed).
  try {
    const [dives, users] = await Promise.all([
      axios.get(resolveUrl('/v1/explore/count/dives')),
      axios.get(resolveUrl('/v1/explore/count/users')),
    ])
    diveCount.value = dives.data as number
    userCount.value = users.data as number
  } catch (err) {
    console.error('Failed to fetch public counts:', err)
  }
})
</script>
