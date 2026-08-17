<template>
  <div
    class="dive-view-shell flex justify-center items-start pt-20 px-6 md:mx-10"
    :style="{ minHeight: 'calc(100dvh - 80px)' }"
  >
    <DiveGraphContainer
      v-if="graphOpen && dive?.profiles"
      :profiles="dive.profiles"
      :dive-id="diveId"
      fullscreen
      @close="graphOpen = false"
      @profiles-aligned="handleProfilesAligned"
      @profile-trimmed="handleProfileTrimmed"
    />

    <div v-else-if="!loading && dive" class="space-y-3 md:space-y-4">
      <!-- Trim suggestion: a profile has a sustained near-surface stretch at its start/end (e.g.
           the trailing few minutes a Divesoft Liberty logs while waiting to be ended manually)
           worth reviewing - dismissible for this session, re-appears on a fresh page load since
           there's no persisted "seen" state yet. -->
      <div
        v-if="isMine && !readOnly && !dismissedTrimSuggestion && profilesWithTrimSuggestion.length"
        class="rounded-xl border border-sky-300 bg-sky-50 dark:bg-sky-900/20 dark:border-sky-700 p-3 flex items-center justify-between gap-3"
      >
        <p class="text-sm text-sky-900 dark:text-sky-100">
          <i class="fa-solid fa-scissors mr-1"></i>
          {{
            profilesWithTrimSuggestion.length === 1
              ? 'This dive has a profile with'
              : `${profilesWithTrimSuggestion.length} profiles have`
          }}
          a near-surface stretch that might be worth trimming.
        </p>
        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="px-3 py-1 text-sm rounded-lg bg-sky-600 text-white hover:bg-sky-700"
            @click="reviewTrimSuggestion"
          >
            Review
          </button>
          <button
            type="button"
            class="px-2 py-1 text-sm text-sky-900 dark:text-sky-100 opacity-70 hover:opacity-100"
            title="Dismiss"
            @click="dismissedTrimSuggestion = true"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <!-- Header -->
      <div
        class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6 flex flex-col"
      >
        <div class="flex justify-between items-start mb-2 gap-4">
          <h1 class="text-2xl font-bold">#{{ dive.number }} : {{ dive.customIdentifier }}</h1>
          <div class="flex flex-col items-end gap-2 shrink-0">
            <div class="flex gap-2">
              <RouterLink
                v-if="isMine && !readOnly"
                :to="{ name: 'DiveEdit', params: { diveId: dive.id } }"
              >
                <button class="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                  Edit
                </button>
              </RouterLink>
              <button
                v-if="isMine && !readOnly"
                @click="showShareModal = true"
                class="bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700"
              >
                Share
              </button>
              <button
                v-if="isMine && !readOnly"
                @click="showDeleteModal = true"
                class="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
              <button
                v-else-if="!isMine && !readOnly"
                @click="showLinkModal = true"
                class="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
              >
                Link Dive
              </button>
            </div>
            <!-- Tags, desktop position: directly under the action buttons. On narrow screens this
                 copy is hidden - a second copy below the site/date line takes over there instead,
                 since "under the buttons" doesn't read well once the header stacks into one
                 column. -->
            <div v-if="dive.tags?.length" class="hidden md:flex flex-wrap gap-1 justify-end max-w-xs">
              <TagBadge
                v-for="tag in dive.tags"
                :key="tag.id"
                :name="tag.name"
                :auto-detected="!!tag.autoDetectRule"
                @click="viewDivesByTag(tag.id)"
                class="cursor-pointer"
              />
            </div>
          </div>
        </div>
        <p class="text-gray-500 dark:text-gray-400 text-sm">
          {{ dive.site.name }} · {{ summary?.start ? formatDate(summary.start) : 'No start date' }}
        </p>
        <div v-if="dive.tags?.length" class="flex md:hidden flex-wrap gap-1 mt-2">
          <TagBadge
            v-for="tag in dive.tags"
            :key="tag.id"
            :name="tag.name"
            :auto-detected="!!tag.autoDetectRule"
            @click="viewDivesByTag(tag.id)"
            class="cursor-pointer"
          />
        </div>
      </div>

      <!-- Delete Modal -->
      <DeletionConfirmation
        v-model="showDeleteModal"
        title="Confirm Delete"
        :message="`Are you sure you want to delete dive #${dive.number}? This action cannot be undone.`"
        :loading="deletingDive"
        @confirm="handleDelete"
      />

      <!-- Link Modal -->
      <div
        v-if="showLinkModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div
          class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-[90%] max-w-lg max-h-[80vh] overflow-auto"
        >
          <h2 class="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Link a Dive</h2>
          <DiveSearchAndLink
            :current-dive-id="diveId"
            :current-dive-site-name="dive.site.name"
            :current-dive-start-date="summary?.start"
            @dive-linked="onDiveLinked"
          />
          <div class="flex justify-end mt-4">
            <button
              @click="showLinkModal = false"
              class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <!-- Share Popover -->
      <SharePopover
        :open="showShareModal"
        :dive-id="dive.id"
        :dive-user-id="dive.user.id"
        @close="showShareModal = false"
      />

      <!-- Reimport Profile Modal (hidden power-user tool, opened via command palette) -->
      <ProfileReimportModal
        v-if="dive.profiles"
        :profiles="dive.profiles"
        :dive-id="diveId"
        :is-open="showReimportModal"
        @close="showReimportModal = false"
        @reimported="handleProfileReimported"
      />

      <!-- Overview: Map alongside multiple rows of small cards - the map keeps its own natural
           size (items-start below) instead of stretching every card next to it to match its
           height, and enough compact rows sit in that column to actually use the space. -->
      <div class="flex flex-col md:flex-row gap-6 items-start">
        <!-- Map -->
        <div class="relative w-full md:w-1/5 h-50 rounded-lg overflow-hidden shadow-sm border shrink-0">
          <DiveSiteMap
            :sites="mapSites"
            :center="mapCenter"
            :zoom="13"
            :show-dive-count-badge="false"
          />
          <!-- A small deliberate corner link, not the whole map - dragging/zooming/clicking a
               marker on the map itself must never accidentally navigate away. -->
          <RouterLink
            :to="{ name: 'MapView' }"
            title="View all dive sites"
            class="absolute bottom-2 right-2 z-[1000] flex items-center gap-1 px-2 py-1 rounded-md bg-white/90 dark:bg-gray-800/90 text-xs font-medium text-gray-700 dark:text-gray-200 shadow hover:bg-white dark:hover:bg-gray-800 hover:underline"
          >
            <i class="fa-solid fa-map"></i>
            All Sites
          </RouterLink>
        </div>

        <div class="w-full md:w-4/5 flex flex-col gap-3">
          <!-- Summary Cards -->
          <InfoCardRow v-if="summary">
            <InfoCard title="Max Depth" :value="`${summary.maxDepth?.toFixed(1)} m`" />
            <InfoCard title="Avg Depth" :value="`${summary.averageDepth?.toFixed(1)} m`" />
            <InfoCard title="Bottom Time" :value="formatDiveTime(summary.bottomTime)" />
          </InfoCardRow>

          <!-- CNS / OTU / GF99: dive-profile-derived stats. GF99 (Start) and GF99 @ Surface
               replace the old "N2 Loading" card: DiveMeasurement.n2 already *is* GF99, not
               literal N2 tissue loading, so "N2 Loading End" and a single-profile "SurfGF" card
               used to print the exact same number under two different labels. "GF99 @ Surface" is
               also a clearer name than "SurfGF" for what this actually is - the GF99 reading once
               genuinely surfaced at the end of the dive, not the continuous "if-I-surfaced-
               right-now" gauge some dive computers also label "Surface GF" throughout the dive. -->
          <InfoCardRow
            v-if="
              firstProfileSummary?.startCNS !== undefined ||
              lastProfileSummary?.endCNS !== undefined ||
              lastProfileSummary?.o2Toxicity !== undefined ||
              showGf99Start ||
              profilesWithSurfacingGf.length
            "
          >
            <!-- CNS Information -->
            <InfoCard
              v-if="
                firstProfileSummary?.startCNS !== undefined ||
                lastProfileSummary?.endCNS !== undefined
              "
              title="CNS (%)"
            >
              <div
                v-if="firstProfileSummary?.startCNS !== undefined"
                class="flex items-center gap-2"
              >
                <span>Start:</span>
                <span class="font-semibold">{{ firstProfileSummary.startCNS.toFixed(0) }}</span>
              </div>
              <div
                v-if="lastProfileSummary?.endCNS !== undefined"
                class="flex items-center gap-2"
              >
                <span>End:</span>
                <span class="font-semibold">{{ lastProfileSummary.endCNS.toFixed(0) }}</span>
              </div>
            </InfoCard>

            <!-- OTU Information -->
            <InfoCard
              v-if="lastProfileSummary?.o2Toxicity !== undefined"
              title="OTUs"
              :value="`${lastProfileSummary?.o2Toxicity?.toFixed(0)}`"
            />

            <!-- GF99 at the start of the dive. -->
            <InfoCard
              v-if="showGf99Start"
              title="GF99 (Start)"
              :value="`${firstProfileSummary!.startN2!.toFixed(0)}%`"
            />

            <!-- GF99 @ Surface: each profile's own surfacing/last GF99 (DiveMeasurement.n2, the
                 same value the graph's "GF99" metric is drawn from). -->
            <InfoCard v-if="profilesWithSurfacingGf.length" title="GF99 @ Surface">
              <div
                v-for="p in profilesWithSurfacingGf"
                :key="p.id"
                class="flex items-center justify-between gap-3"
              >
                <span>{{ p.diveComputer?.customIdentifier ?? 'Unknown computer' }}</span>
                <span class="font-semibold">{{ p.summary.endN2!.toFixed(0) }}%</span>
              </div>
            </InfoCard>
          </InfoCardRow>
        </div>
      </div>

      <!-- Details Grid -->
      <InfoCardRow>
        <InfoCard title="Gases">
          <ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li
              v-for="entry in allGases"
              :key="`${entry.gas.o2}/${entry.gas.he}/${entry.gas.n2}/${entry.role ?? 'none'}`"
            >
              <GasDisplay
                :gas="entry.gas"
                :show-details="showGasDetails"
                :role-label="entry.roleLabel"
                :contributing-computers="entry.contributingComputers"
              />
            </li>
            <li v-if="allGases.length === 0" class="text-gray-400 dark:text-gray-500">
              No gas data
            </li>
          </ul>
        </InfoCard>
        <InfoCard title="Dive Computers">
          <button
            class="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-center block w-full"
            v-for="computer in uniqueComputers"
            :key="computer.id"
            @click="viewDivesForComputer(computer.id)"
          >
            {{ computer.customIdentifier }} ({{ computer.manufacturer.name }})
          </button>
        </InfoCard>
        <InfoCard title="Buddies">
          <p
            v-if="!dive.namedBuddies.length && !dive.buddiesDives?.length"
            class="text-xs text-gray-400 dark:text-gray-500"
          >
            No buddies recorded
          </p>
          <ul v-else class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li v-for="name in dive.namedBuddies" :key="`named-${name}`">{{ name }}</li>
          </ul>
        </InfoCard>
      </InfoCardRow>

      <!-- Profiles Row: only relevant (and only shown) once a dive actually has more than
           one profile - lets you remove one attached to the wrong dive by mistake (e.g. via
           import) without deleting the whole dive. -->
      <InfoCardRow v-if="isMine && !readOnly && dive.profiles.length > 1">
        <InfoCard title="Profiles">
          <div
            v-for="profile in dive.profiles"
            :key="profile.id"
            class="flex items-center justify-between gap-3"
          >
            <span
              >{{ profile.diveComputer?.customIdentifier ?? 'Unknown computer' }} ·
              {{ formatDate(profile.start) }}</span
            >
            <button
              type="button"
              class="text-red-600 hover:text-red-700"
              title="Delete this profile"
              @click="confirmDeleteProfile(profile.id)"
            >
              Delete
            </button>
          </div>
        </InfoCard>
      </InfoCardRow>

      <DeletionConfirmation
        v-model="showDeleteProfileModal"
        title="Delete profile"
        message="This removes this profile's measurements from the dive permanently, keeping the rest of the dive intact. This action cannot be undone."
        confirm-text="Delete profile"
        :loading="deletingProfile"
        @confirm="handleDeleteProfile"
      />

      <!-- Suit / Base Configuration / CCR Unit / Weight / Visibility / Gas Consumption - each
           is a small value or two, so they share this one wrapping row instead of each
           getting a full-width panel with its own header (Cylinders keeps its own panel below
           - it's a small table, not a single value/pair). -->
      <InfoCardRow v-if="dive.configuration || dive.visibility?.feeling || hasGasConsumption">
        <InfoCard v-if="dive.configuration?.suit?.type" title="Suit">
          <button
            v-if="dive.configuration.suit.id"
            type="button"
            @click="viewDivesForSuit(dive.configuration.suit.id)"
            class="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-center block w-full"
          >
            {{ suitLabel }}
          </button>
          <span v-else>{{ suitLabel }}</span>
        </InfoCard>
        <InfoCard v-if="dive.configuration?.base" title="Base Config">
          <span>{{ BASE_CONFIGURATION_LABELS[dive.configuration.base] }}</span>
        </InfoCard>
        <InfoCard
          v-if="
            dive.configuration &&
            isCcrBaseConfiguration(dive.configuration.base) &&
            dive.configuration.ccrUnit
          "
          title="CCR Unit"
        >
          <span>{{ dive.configuration.ccrUnit.name }}</span>
        </InfoCard>
        <InfoCard
          v-if="dive.configuration?.weight !== undefined && dive.configuration.weight !== null"
          title="Weight"
        >
          <span>{{ dive.configuration.weight }} kg</span>
          <span v-if="dive.configuration.weightFeeling" class="capitalize">
            &middot; {{ dive.configuration.weightFeeling.toLowerCase() }}</span
          >
        </InfoCard>
        <InfoCard v-if="dive.visibility?.feeling" title="Visibility">
          <span class="capitalize">{{ dive.visibility.feeling.toLowerCase() }}</span>
          <span v-if="dive.visibility.meters != null"> &middot; {{ dive.visibility.meters }} m</span>
        </InfoCard>
        <!-- SAC deliberately dropped: it's not meaningful for CCR (no continuous OC breathing
             rate on a closed loop) and depends on cylinder size even for OC, so it isn't
             comparable across dives with different cylinders - RMV alone is. These come from
             tracked per-dive cylinders (Cylinders panel below), not the old whole-dive
             gasConsumption figure. -->
        <InfoCard
          v-if="dive.cylinderConsumption?.ocRmvLiters != null"
          title="RMV"
          :value="`${dive.cylinderConsumption.ocRmvLiters.toFixed(2)} l/min`"
        />
        <InfoCard
          v-if="dive.cylinderConsumption?.bailoutRmvLiters != null"
          title="Bailout RMV"
          :value="`${dive.cylinderConsumption.bailoutRmvLiters.toFixed(2)} l/min`"
        />
        <InfoCard
          v-if="dive.cylinderConsumption?.o2Liters != null"
          title="O2 Used"
          :value="`${dive.cylinderConsumption.o2Liters.toFixed(0)} l`"
        />
        <InfoCard
          v-if="dive.cylinderConsumption?.diluentLiters != null"
          title="Diluent Used"
          :value="`${dive.cylinderConsumption.diluentLiters.toFixed(0)} l`"
        />
        <InfoCard
          v-if="
            dive.gasConsumption?.totalLiters !== undefined &&
            dive.gasConsumption.totalLiters !== null
          "
          title="Total Gas"
          :value="`${dive.gasConsumption.totalLiters.toFixed(1)} l`"
        />
      </InfoCardRow>

      <!-- Cylinders - the one piece of Configuration dense enough to keep its own panel; Suit/Base
           Config/CCR Unit/Weight/Visibility/Gas Consumption moved into the compact InfoCardRow
           above. -->
      <div
        v-if="dive.configuration?.cylinders?.length"
        class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6"
      >
        <h2 class="text-lg font-semibold mb-3">Cylinders</h2>
        <div class="space-y-3">
          <div
            v-for="(cylinder, idx) in dive.configuration.cylinders"
            :key="idx"
            class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
          >
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span class="text-gray-600 dark:text-gray-400">Size</span>
                <p class="font-semibold">
                  {{ cylinder.size.value }} {{ cylinder.size.unit === 'LITER' ? 'l' : 'cf' }}
                </p>
              </div>
              <div>
                <span class="text-gray-600 dark:text-gray-400">Gas</span>
                <p class="font-semibold">
                  {{ Math.round(cylinder.gas.o2 * 100) }}/{{ Math.round(cylinder.gas.he * 100) }}
                </p>
              </div>
              <div>
                <span class="text-gray-600 dark:text-gray-400">Role</span>
                <p class="font-semibold">{{ CYLINDER_ROLE_LABELS[cylinder.role] }}</p>
              </div>
              <div v-if="cylinder.startBar !== undefined && cylinder.startBar !== null">
                <span class="text-gray-600 dark:text-gray-400">Start Pressure</span>
                <p class="font-semibold">{{ cylinder.startBar }} bar</p>
              </div>
              <div v-if="cylinder.endBar !== undefined && cylinder.endBar !== null">
                <span class="text-gray-600 dark:text-gray-400">End Pressure</span>
                <p class="font-semibold">{{ cylinder.endBar }} bar</p>
              </div>
              <div v-if="cylinder.notes">
                <span class="text-gray-600 dark:text-gray-400">Notes</span>
                <p class="font-semibold">{{ cylinder.notes }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dive Profile Graph - the lowermost card except for Notes below it: everything else on
           the page is a quick-scan summary, so the (comparatively heavy) graph itself is the last
           thing reached, not the first. Still standalone with nothing beside it. -->
      <div
        class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-md w-full flex flex-col"
        ref="embeddedGraphCardRef"
      >
        <div class="flex justify-between items-center p-4">
          <h2 class="font-semibold text-sm" :style="{ color: 'var(--foreground)' }">
            Dive Profile
          </h2>
          <button @click="graphOpen = true" class="text-sm text-blue-600 hover:underline">
            Expand
          </button>
        </div>
        <DiveGraphContainer
          v-if="dive.profiles"
          ref="embeddedGraphRef"
          :profiles="dive.profiles"
          :dive-id="diveId"
          @profiles-aligned="handleProfilesAligned"
          @profile-trimmed="handleProfileTrimmed"
        />
      </div>

      <!-- Notes Panel -->
      <div
        v-if="dive.notes"
        class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6"
      >
        <h2 class="text-lg font-semibold mb-3">Notes</h2>
        <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ dive.notes }}</p>
      </div>
    </div>

    <div v-else-if="loading" class="text-center py-20">Loading...</div>
    <div v-else-if="error" class="text-center py-20 text-red-500">Error: {{ error }}</div>
    <div v-else class="text-center py-20">No dive found</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { formatISoDurationToTime, formatDate } from '@/lib/utils/timeUtils'
import DiveSiteMap from '@/components/DiveSiteMap.vue'
import DiveSearchAndLink from '@/components/DiveSearchAndLink.vue'
import DiveGraphContainer from '@/components/dive/view/DiveGraphContainer.vue'
import GasDisplay from '@/components/dive/view/GasDisplay.vue'
import InfoCard from '@/components/InfoCard.vue'
import InfoCardRow from '@/components/InfoCardRow.vue'
import SharePopover from '@/components/share/SharePopover.vue'
import DeletionConfirmation from '@/components/DeletionConfirmation.vue'
import ProfileReimportModal from '@/components/dive/view/ProfileReimportModal.vue'
import type { Dive, DiveComputer } from '@/lib/types/dive'
import {
  BASE_CONFIGURATION_LABELS,
  SUIT_TYPE_LABELS,
  CYLINDER_ROLE_LABELS,
  isCcrBaseConfiguration,
} from '@/lib/types/dive'
import { computeGasList, isGaugeModeProfile, type GasListEntry } from '@/lib/dive/gasRoles'
import { detectTrimSuggestion } from '@/lib/graph/trimSuggestion'
import TagBadge from '@/components/dive/TagBadge.vue'
import type { User } from '@/lib/types/user'
import { useProfileReimportStore } from '@/stores/profileReimport'
import { storeToRefs } from 'pinia'
import { useReadOnlyMode } from '@/composables/useReadOnlyMode'

const router = useRouter()
const route = useRoute()
const { getWithToken, deleteWithToken } = useApi()
const profileReimportStore = useProfileReimportStore()
const { requestId: reimportRequestId } = storeToRefs(profileReimportStore)
const { readOnly } = useReadOnlyMode()

const diveId = computed(() => Number(route.params.diveId))
const dive = ref<Dive | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const graphOpen = ref(false)
const showDeleteModal = ref(false)
const showLinkModal = ref(false)
const showShareModal = ref(false)
const showReimportModal = ref(false)
const myUserId = ref<number | null>(null)

const summary = computed(() => dive.value?.summary)
const isMine = computed(() => dive.value?.user.id === myUserId.value)

// Hoisted out of the template (which previously built a brand-new array/object literal here on
// every render) so DiveSiteMap gets a stable prop reference across unrelated re-renders of this
// view - a fresh reference every time defeats its own marker-icon memoization and forces Leaflet
// to redo the marker's DOM for no reason.
const mapSites = computed(() => {
  const currentDive = dive.value
  if (!currentDive) return []
  return [
    {
      site: { id: currentDive.site.id!, ...currentDive.site },
      diveCount: 1,
      diveInfo: [{ ...currentDive }],
    },
  ]
})
const mapCenter = computed<[number, number] | undefined>(() => {
  const site = dive.value?.site
  return site ? [site.latitude, site.longitude] : undefined
})

const viewDivesForSuit = (suitId: number) => {
  router.push({ name: 'DiveList', query: { suitId: suitId.toString() } })
}

const suitLabel = computed(() => {
  const suit = dive.value?.configuration?.suit
  if (!suit?.type) return ''
  const label = SUIT_TYPE_LABELS[suit.type]
  return suit.thickness != null ? `${label} · ${suit.thickness} mm` : label
})

const viewDivesByTag = (tagId: number) => {
  router.push({ name: 'DiveList', query: { tagIds: String(tagId) } })
}

const viewDivesForComputer = (computerId: number) => {
  router.push({ name: 'DiveList', query: { computerId: computerId.toString() } })
}

const firstProfile = computed(() => dive.value?.profiles[0])
const lastProfile = computed(() => {
  const profiles = dive.value?.profiles
  if (!profiles) {
    return undefined
  }
  return profiles[profiles.length - 1]
})
const firstProfileSummary = computed(() => firstProfile.value?.summary)
const lastProfileSummary = computed(() => lastProfile.value?.summary)

// Guards the "GF99 (Start)" card: a computer in gauge mode reports n2=0 for every sample, which
// looks identical to a real "0%" start reading unless every sample is checked, not just the
// first one - see isGaugeModeProfile's own doc comment.
const showGf99Start = computed(() => {
  const profile = firstProfile.value
  return profile?.summary?.startN2 !== undefined && !isGaugeModeProfile(profile)
})

// Each profile's own surfacing/last GF99 (DiveMeasurement.n2, same value the graph's "GF99"
// metric is drawn from) - the "GF99 @ Surface" card only lists profiles that actually have one,
// excluding gauge-mode computers whose n2 is a flat 0 throughout rather than a real reading.
const profilesWithSurfacingGf = computed(
  () =>
    dive.value?.profiles.filter((p) => p.summary?.endN2 !== undefined && !isGaugeModeProfile(p)) ??
    [],
)

const hasGasConsumption = computed(() => {
  const cylinderConsumption = dive.value?.cylinderConsumption
  return (
    (dive.value?.gasConsumption?.totalLiters ?? null) !== null ||
    (cylinderConsumption?.ocRmvLiters ?? null) !== null ||
    (cylinderConsumption?.bailoutRmvLiters ?? null) !== null ||
    (cylinderConsumption?.o2Liters ?? null) !== null ||
    (cylinderConsumption?.diluentLiters ?? null) !== null
  )
})

const uniqueComputers = computed(() => {
  const profiles = dive.value?.profiles ?? []
  const computerMap = new Map<number | string, DiveComputer>()
  for (const profile of profiles) {
    const computer = profile.diveComputer
    if (!computer) continue
    const key = computer.id ?? computer.serialNumber
    if (!computerMap.has(key)) {
      computerMap.set(key, computer)
    }
  }
  return new Set(computerMap.values())
})

const allGases = computed<GasListEntry[]>(() => {
  const currentDive = dive.value
  if (!currentDive?.profiles) return []
  const isCcr = currentDive.configuration?.base
    ? isCcrBaseConfiguration(currentDive.configuration.base)
    : false
  return computeGasList(currentDive.profiles, isCcr)
})

const showGasDetails = computed(() => allGases.value.length <= 3)

const dismissedTrimSuggestion = ref(false)
const profilesWithTrimSuggestion = computed(() => {
  const profiles = dive.value?.profiles
  if (!profiles) return []
  return profiles.filter((p) => {
    const suggestion = detectTrimSuggestion(p)
    return suggestion.suggestedStart !== null || suggestion.suggestedEnd !== null
  })
})

// "Review" on the trim-suggestion banner used to jump straight to the fullscreen graph modal -
// this instead scrolls to the already-visible embedded graph and opens trim mode there directly,
// matching what the "Trim profile" button inside DiveGraphContainer itself does.
const embeddedGraphCardRef = ref<HTMLElement | null>(null)
const embeddedGraphRef = ref<InstanceType<typeof DiveGraphContainer> | null>(null)

const reviewTrimSuggestion = () => {
  const suggested = profilesWithTrimSuggestion.value[0]
  if (!suggested) return
  embeddedGraphCardRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  embeddedGraphRef.value?.startTrimmingProfile(suggested.id)
}

// Guards against an out-of-order response: if the user navigates to a different dive before an
// earlier fetch resolves, that stale response must never overwrite what's now on screen (or,
// worse, let a Delete/Edit action fire against the route's *new* diveId while the page still
// displays the *old* dive's data). Only the most recently started fetch is allowed to apply.
let fetchDiveRequestId = 0

const fetchDive = async () => {
  const requestId = ++fetchDiveRequestId
  const requestedDiveId = diveId.value
  try {
    loading.value = true
    const res = await getWithToken<Dive>(`/v1/dives/${requestedDiveId}`)
    if (requestId !== fetchDiveRequestId) return
    dive.value = res.data
  } catch (err) {
    if (requestId !== fetchDiveRequestId) return
    error.value = err instanceof Error ? err.message : 'Failed to fetch dive'
  } finally {
    if (requestId === fetchDiveRequestId) loading.value = false
  }
}

const fetchUserId = async () => {
  try {
    const res = await getWithToken<User>('/v1/users/')
    myUserId.value = res.data.id
  } catch (err) {
    console.error('Failed to fetch user ID', err)
  }
}

// Backs the 'n'/'p' shortcuts below - null at either end (already the first/last dive), and
// deliberately only fetched for your own dives, not a shared/reader view of someone else's (see
// the backend's own AdjacentDives doc comment: dive numbers are only unique per user, so "next/
// previous" isn't well-defined for someone else's log unless it happens to be entirely visible to
// you, which isn't guaranteed just because one dive was shared).
const adjacentDives = ref<{ previousDiveId: number | null; nextDiveId: number | null } | null>(
  null,
)

const fetchAdjacentDives = async () => {
  const currentDiveId = dive.value?.id
  if (!currentDiveId || !isMine.value) {
    adjacentDives.value = null
    return
  }
  try {
    const res = await getWithToken<{ previousDiveId: number | null; nextDiveId: number | null }>(
      `/v1/dives/${currentDiveId}/adjacent`,
    )
    adjacentDives.value = res.data
  } catch {
    adjacentDives.value = null
  }
}

watch(() => [dive.value?.id, isMine.value] as const, fetchAdjacentDives)

const showDeleteProfileModal = ref(false)
const profileIdToDelete = ref<number | null>(null)

const confirmDeleteProfile = (profileId: number) => {
  profileIdToDelete.value = profileId
  showDeleteProfileModal.value = true
}

const deletingProfile = ref(false)

const handleDeleteProfile = async () => {
  if (!dive.value || profileIdToDelete.value === null || deletingProfile.value) return
  deletingProfile.value = true
  try {
    // Keyed off the dive actually on screen (dive.value.id), not the route param (diveId.value) -
    // these can only ever differ for a moment mid-navigation, but a mutation should always act on
    // what the user is looking at, not on whatever the URL happens to say right now.
    const res = await deleteWithToken<Dive>(
      `/v1/dives/${dive.value.id}/profiles/${profileIdToDelete.value}`,
    )
    dive.value = res.data
    toast.success('Profile deleted')
  } catch (err) {
    console.error('Delete profile failed', err)
    toast.error('Failed to delete profile')
  } finally {
    deletingProfile.value = false
    showDeleteProfileModal.value = false
    profileIdToDelete.value = null
  }
}

const deletingDive = ref(false)

const handleDelete = async () => {
  if (!dive.value || deletingDive.value) return
  deletingDive.value = true
  try {
    await deleteWithToken(`/v1/dives/${dive.value.id}`)
    toast.success('Dive deleted successfully')
    router.push({ name: 'DiveList' })
  } catch (err) {
    console.error('Delete failed', err)
    toast.error('Failed to delete dive')
    deletingDive.value = false
  }
}

const onDiveLinked = () => {
  showLinkModal.value = false
}

const handleProfilesAligned = (updatedDive: Dive) => {
  // Replace the current dive with the updated one from the alignment response
  dive.value = updatedDive
  toast.success('Profiles aligned successfully')
}

const handleProfileTrimmed = (updatedDive: Dive) => {
  // DiveGraphContainer already toasts success/failure for the trim itself - just refresh state.
  dive.value = updatedDive
}

const handleProfileReimported = (updatedDive: Dive) => {
  dive.value = updatedDive
  toast.success('Profile reimported successfully')
}

const formatDiveTime = (duration?: string): string => {
  return formatISoDurationToTime(duration)
}

// Keyboard shortcuts for DiveView
const handleDiveViewKeydown = (event: KeyboardEvent) => {
  // Don't trigger shortcuts when typing in input/textarea
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    return
  }

  // 'e' for edit
  if (event.key.toLowerCase() === 'e' && !event.ctrlKey && !event.metaKey && isMine.value && !readOnly.value) {
    router.push({ name: 'DiveEdit', params: { diveId: dive.value?.id } })
  }
  // 's' for share
  if (event.key.toLowerCase() === 's' && !event.ctrlKey && !event.metaKey && isMine.value && !readOnly.value) {
    showShareModal.value = true
  }
  // 'd' for delete
  if (event.key.toLowerCase() === 'd' && !event.ctrlKey && !event.metaKey && isMine.value && !readOnly.value) {
    showDeleteModal.value = true
  }
  // 'l' for link dive
  if (event.key.toLowerCase() === 'l' && !event.ctrlKey && !event.metaKey && !isMine.value && !readOnly.value) {
    showLinkModal.value = true
  }
  // 'n'/'p' for next/previous dive by number in your own dive log - see adjacentDives' own
  // comment for why this is isMine-only. No-op at either end (adjacentDives.value is null there),
  // same convention as the dive list/stats page-forward/back shortcuts elsewhere in the app.
  if (event.key.toLowerCase() === 'n' && !event.ctrlKey && !event.metaKey && isMine.value) {
    const nextId = adjacentDives.value?.nextDiveId
    if (nextId != null) {
      router.push({ name: 'DiveView', params: { diveId: nextId } })
    }
  }
  if (event.key.toLowerCase() === 'p' && !event.ctrlKey && !event.metaKey && isMine.value) {
    const previousId = adjacentDives.value?.previousDiveId
    if (previousId != null) {
      router.push({ name: 'DiveView', params: { diveId: previousId } })
    }
  }
}

onMounted(() => {
  fetchDive()
  fetchUserId()
  window.addEventListener('keydown', handleDiveViewKeydown)
})

watch(() => diveId.value, fetchDive)

watch(reimportRequestId, () => {
  if (dive.value?.profiles?.length && isMine.value && !readOnly.value) {
    showReimportModal.value = true
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleDiveViewKeydown)
})
</script>

<style scoped>
.dive-card {
  background-color: var(--card-bg);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
}

[data-theme='dark'] .dive-card {
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}
</style>
