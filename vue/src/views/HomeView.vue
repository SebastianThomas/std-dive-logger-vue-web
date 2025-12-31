<template>
  <div class="min-h-full">
    <main class="flex-1 relative p-6 md:p-10">
      <h2 class="text-3xl text-white font-bold text-center mb-8">Discover What You Can Do</h2>

      <div class="flex flex-wrap gap-6 justify-center pb-4">
        <FeatureCard
          v-for="(feature, index) in features"
          :key="index + '-feature-card'"
          :feature="feature"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { resolveUrl } from '@/lib/globals/url/resolveUrl'
import { type FeatureCardProps } from '@/lib/types/feature'
import FeatureCard from '@/components/FeatureCard.vue'

const initialFeatures: FeatureCardProps[] = [
  {
    image: '/images/analyze1.png',
    title: 'Analyze your dives',
    description:
      'Gain insights into your dives with detailed stats and charts. Simply upload your dive logs and instantly get an overview of your dive.',
  },
  {
    image: '/images/group.jpg',
    title: 'Share your dives',
    description:
      'Share your dives with friends and diving groups. Whether it is planning your next trip or just showing off your favorite dives, this app offers easy and secure sharing of your logs.',
  },
  {
    image: '/images/merge.png',
    title: 'Combine profiles',
    description:
      'Merge diving profiles to create a single continuous dive. No more looking through loads of profiles. Just combine them and enjoy a clean overview of your full dives ',
  },
]

const features = ref<FeatureCardProps[]>(initialFeatures)

onMounted(async () => {
  try {
    const [diveCountData, userCountData] = await Promise.all([
      axios.get(resolveUrl('/v1/explore/count/dives')),
      axios.get(resolveUrl('/v1/explore/count/users')),
    ])
    const diveCount = diveCountData.data as number
    const userCount = userCountData.data as number
    const newFeature: FeatureCardProps = {
      title: 'Statistics',
      description: `There are ${userCount} users signed up, having logged ${diveCount} dives.`,
      image: '/images/stats.jpeg',
    }
    features.value = [...features.value, newFeature]
  } catch (err) {
    console.error('Failed to fetch statistics:', err)
  }
})
</script>
