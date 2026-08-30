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

    <!-- w-full: without an explicit width, this flex item (under the shell's justify-center)
         shrinks to fit its own widest content instead of filling the available space - a dive
         whose content happens to be narrower than another dive's then renders visibly narrower
         and centered, rather than every dive consistently filling the same width. -->
    <div v-else-if="!loading && dive" class="w-full space-y-3 md:space-y-4">
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
        <div class="flex flex-wrap justify-between items-start mb-2 gap-x-4 gap-y-2">
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="text-2xl font-bold">#{{ dive.number }} : {{ dive.customIdentifier }}</h1>
            <span
              v-if="isManualDive"
              class="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
              title="Logged manually - no dive computer profile was recorded"
            >
              Manually logged
            </span>
          </div>
          <!-- ml-auto keeps the buttons right-aligned when they wrap onto their own line. -->
          <div class="flex flex-wrap gap-2 justify-end ml-auto">
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
        </div>
        <!-- Site/date and tags share one line - tags used to sit up under the action buttons,
             visually stranded between the title and this line rather than reading as part of it. -->
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-gray-500 dark:text-gray-400 text-sm">
            {{ dive.site.name }} ·
            {{ summary?.start ? formatDate(summary.start) : 'No start date' }}
          </p>
          <div v-if="dive.tags?.length" class="flex flex-wrap gap-1">
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
        <!-- Trips/courses this dive belongs to - kept up here next to the site and date, since
             "which trip was this" is context you want before scrolling the whole dive. -->
        <div v-if="diveTrips.length" class="mt-1.5 flex flex-wrap gap-1.5">
          <RouterLink
            v-for="trip in diveTrips"
            :key="trip.id"
            :to="{ name: 'TripEdit', params: { tripId: String(trip.id) } }"
            class="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200 hover:opacity-80"
          >
            <i class="fas fa-compass mr-1"></i>{{ trip.name }}
          </RouterLink>
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
        <!-- Map - the whole thing (not a corner badge, which overlapped the tile attribution
             text) is the link to the all-sites map: clicking a marker still opens its popup
             instead, since Leaflet doesn't bubble marker clicks up to the map's own click
             handler, and dragging/zooming don't register as a click at all. Google Maps for this
             specific site lives in that popup instead of a separate on-page button - see
             DiveSiteMapPopup. overflow-hidden clips the tile layer to the rounded corners - a
             popup opened on this small box can still get its top edge clipped by the same rule
             (Leaflet has no way to exempt just the popup from a container's own overflow:hidden;
             see DiveSiteMap.vue's style comment), but DiveSiteMapPopup's `compact` mode keeps
             popups short enough that this is now the exception, not routine. -->
        <div class="relative w-full md:w-1/5 h-50 rounded-lg overflow-hidden shadow-sm border shrink-0">
          <DiveSiteMap
            :sites="mapSites"
            :center="mapCenter"
            :zoom="13"
            :show-dive-count-badge="false"
            link-to-all-sites
            compact
          />
        </div>

        <div class="w-full md:w-4/5 flex flex-col gap-3">
          <!-- Summary Cards -->
          <InfoCardRow v-if="summary">
            <InfoCard title="Max Depth" :value="`${summary.maxDepth?.toFixed(1)} m`" />
            <InfoCard
              title="Avg Depth"
              :value="summary.averageDepth != null ? `${summary.averageDepth.toFixed(1)} m` : '—'"
            />
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
              cnsCoverage?.startValue != null ||
              cnsCoverage?.endValue != null ||
              otuCoverage?.endValue != null ||
              showGf99Start ||
              profilesWithSurfacingGf.length ||
              summary?.maxTimeToSurface !== undefined
            "
          >
            <!-- CNS Information -->
            <InfoCard
              v-if="cnsCoverage && (cnsCoverage.startValue != null || cnsCoverage.endValue != null)"
              title="CNS (%)"
              :warning="coverageNote(cnsCoverage)"
            >
              <div v-if="cnsCoverage.startValue != null" class="flex items-center gap-2">
                <span>Start:</span>
                <span class="font-semibold">{{ cnsCoverage.startValue.toFixed(0) }}</span>
              </div>
              <div v-if="cnsCoverage.endValue != null" class="flex items-center gap-2">
                <span>End:</span>
                <span class="font-semibold">{{ cnsCoverage.endValue.toFixed(0) }}</span>
              </div>
            </InfoCard>

            <!-- OTU Information -->
            <InfoCard
              v-if="otuCoverage?.endValue != null"
              title="OTUs"
              :value="`${otuCoverage.endValue.toFixed(0)}`"
              :warning="coverageNote(otuCoverage)"
            />

            <!-- GF99 at the start of the dive. -->
            <InfoCard
              v-if="showGf99Start && gf99StartCoverage"
              title="GF99 (Start)"
              :value="`${gf99StartCoverage.startValue!.toFixed(0)}%`"
              :warning="coverageNote(gf99StartCoverage)"
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

            <!-- Max TTS: device-assumed-ascent-rate seconds-to-surface, peaked across every
                 profile - present whenever the source format carries it (Suunto JSON, Shearwater
                 native XML, Subsurface XML/UDDF's derived estimate), not just for a genuine
                 mandatory-stop dive (see AGENTS.md's Ceiling-vs-TTS distinction). -->
            <InfoCard
              v-if="summary?.maxTimeToSurface !== undefined"
              title="Max TTS"
              :value="formatDiveTime(summary.maxTimeToSurface)"
            />
          </InfoCardRow>

          <!-- Details Grid - kept in this same column (not its own full-width row further down
               the page) so the column's own content comes closer to matching the map's height
               next to it, instead of leaving a large mismatched gap below a couple of short rows. -->
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
              <RouterLink
                class="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-center block w-full"
                v-for="computer in uniqueComputers"
                :key="computer.id"
                :to="{ name: 'DiveComputerDetail', params: { computerId: computer.id } }"
              >
                {{ computer.customIdentifier }} ({{ computer.manufacturer.name }})
              </RouterLink>
            </InfoCard>
            <InfoCard :title="buddyTerminologyPlural">
              <p
                v-if="!dive.namedBuddies.length && !dive.buddiesDives?.length"
                class="text-xs text-gray-400 dark:text-gray-500"
              >
                No {{ buddyTerminologyPlural.toLowerCase() }} recorded
              </p>
              <ul v-else class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li v-for="buddy in dive.namedBuddies" :key="`named-${buddy.id}`">
                  <span
                    :class="{
                      'font-semibold':
                        dive.leader.type === 'NAMED' && dive.leader.namedBuddyId === buddy.id,
                    }"
                    :title="
                      dive.leader.type === 'NAMED' && dive.leader.namedBuddyId === buddy.id
                        ? 'Dive leader'
                        : undefined
                    "
                  >
                    {{ buddy.name }}
                  </span>
                  <span v-if="buddy.role" class="text-gray-400 dark:text-gray-500">
                    ({{ BUDDY_ROLE_LABELS[buddy.role] }})</span
                  >
                </li>
                <li v-for="linked in dive.buddiesDives" :key="`linked-${linked.diveId}`">
                  <RouterLink
                    :to="{ name: 'DiveView', params: { diveId: linked.diveId } }"
                    class="text-blue-600 hover:underline"
                    :class="{
                      'font-semibold':
                        dive.leader.type === 'LINKED' &&
                        dive.leader.linkedDiveId === linked.diveId,
                    }"
                    :title="
                      dive.leader.type === 'LINKED' && dive.leader.linkedDiveId === linked.diveId
                        ? 'Dive leader'
                        : undefined
                    "
                  >
                    {{ linked.buddy.name }}
                  </RouterLink>
                </li>
              </ul>
              <p
                v-if="dive.leader.type === 'SELF'"
                class="text-xs font-semibold mt-1"
                title="Dive leader"
              >
                {{ dive.user.name }}
              </p>
            </InfoCard>
          </InfoCardRow>
        </div>
      </div>

      <!-- Dive Profile Graph - placed right below the header's own quick-scan cards (Depth/Bottom
           Time/CNS/GF99) so it's visible without scrolling, ahead of the denser
           gases/computers/buddies/cylinders detail below it. Still standalone with nothing beside
           it. -->
      <div
        class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-md w-full flex flex-col"
        ref="embeddedGraphCardRef"
      >
        <div class="flex flex-wrap justify-between items-center gap-x-4 gap-y-1 p-4">
          <h2 class="font-semibold text-sm" :style="{ color: 'var(--foreground)' }">
            Dive Profile
          </h2>
          <div v-if="!isManualDive" class="flex items-center gap-4 text-sm">
            <button
              v-if="isMine && !readOnly && dive.profiles?.length"
              @click="showReimportModal = true"
              class="whitespace-nowrap text-blue-600 hover:underline"
              title="Re-parse this dive's file (or a richer export in another format) and refresh a profile's depth / deco / TTS data in place - keeps your notes, buddies, cylinders, alignment."
            >
              <i class="fa-solid fa-arrows-rotate mr-1"></i>Refine with a file
            </button>
            <button @click="graphOpen = true" class="whitespace-nowrap text-blue-600 hover:underline">
              Expand
            </button>
          </div>
        </div>
        <div
          v-if="isManualDive"
          class="px-4 pb-6 text-sm text-gray-500 dark:text-gray-400 text-center"
        >
          No profile recorded - this dive was logged manually.
        </div>
        <DiveGraphContainer
          v-else-if="dive.profiles"
          ref="embeddedGraphRef"
          :profiles="dive.profiles"
          :dive-id="diveId"
          @profiles-aligned="handleProfilesAligned"
          @profile-trimmed="handleProfileTrimmed"
        />
      </div>

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
      <InfoCardRow
        v-if="
          dive.configuration ||
          dive.visibility?.feeling ||
          hasGasConsumption ||
          effectiveWaterType ||
          dive.current
        "
      >
        <InfoCard v-if="suitLabel" title="Suit">
          <RouterLink
            v-if="suitIsLinkable"
            :to="{ name: 'SuitDetail', params: { suitId: dive.configuration.suit.id } }"
            class="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-center block w-full"
          >
            {{ suitLabel }}
          </RouterLink>
          <span v-else>{{ suitLabel }}</span>
        </InfoCard>
        <InfoCard v-if="dive.configuration?.base" title="Base Config">
          <span>{{ BASE_CONFIGURATION_LABELS[dive.configuration.base] }}</span>
        </InfoCard>
        <InfoCard v-if="dive.configuration?.ccrUnit" title="CCR Unit">
          <RouterLink
            :to="{ name: 'CcrUnitDetail', params: { ccrUnitId: dive.configuration.ccrUnit.id } }"
            class="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-center block w-full"
          >
            {{ dive.configuration.ccrUnit.name }}
          </RouterLink>
          <RouterLink
            v-if="dive.configuration.secondaryCcrUnit"
            :to="{
              name: 'CcrUnitDetail',
              params: { ccrUnitId: dive.configuration.secondaryCcrUnit.id },
            }"
            class="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-center block w-full"
          >
            {{ dive.configuration.secondaryCcrUnit.name }}
          </RouterLink>
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
        <InfoCard v-if="effectiveWaterType" title="Water Type">
          <span>{{ WATER_TYPE_LABELS[effectiveWaterType] }}</span>
          <span v-if="!dive.waterType" class="text-gray-400 dark:text-gray-500">
            &middot; site default
          </span>
        </InfoCard>
        <InfoCard v-if="dive.current" title="Current">
          <span v-if="dive.current.feeling != null">{{ dive.current.feeling }} / 5</span>
          <span v-if="dive.current.knots != null">
            <span v-if="dive.current.feeling != null"> &middot; </span>{{ dive.current.knots }} kn
          </span>
          <span
            v-if="dive.current.description"
            class="block text-xs text-gray-500 dark:text-gray-400"
            >{{ dive.current.description }}</span
          >
        </InfoCard>
        <!-- SAC deliberately dropped: it's not meaningful for CCR (no continuous OC breathing
             rate on a closed loop) and depends on cylinder size even for OC, so it isn't
             comparable across dives with different cylinders - RMV alone is. These come from
             tracked per-dive cylinders (Cylinders panel below), not the old whole-dive
             gasConsumption figure. -->
        <InfoCard v-if="rmvDisplay" title="RMV">
          <div
            class="font-semibold text-sm text-center"
            :style="{ color: 'var(--foreground)' }"
          >
            {{ rmvDisplay.value.toFixed(2) }} l/min
          </div>
          <div
            v-if="gasSourceNote(rmvDisplay.source)"
            class="text-[11px] text-gray-400 dark:text-gray-500 text-center"
          >
            {{ gasSourceNote(rmvDisplay.source) }}
          </div>
        </InfoCard>
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
        <InfoCard v-if="totalGasDisplay != null" title="Total Gas">
          <div
            class="font-semibold text-sm text-center"
            :style="{ color: 'var(--foreground)' }"
          >
            {{ totalGasDisplay.toFixed(1) }} l
          </div>
          <div
            v-if="gasSourceNote(gasCmp.effectiveTotalSource)"
            class="text-[11px] text-gray-400 dark:text-gray-500 text-center"
          >
            {{ gasSourceNote(gasCmp.effectiveTotalSource) }}
          </div>
        </InfoCard>
      </InfoCardRow>

      <!-- Gas-consumption mismatch: the manually-entered figures and the cylinder-derived ones
           disagree by more than 15% - one of them is likely wrong. Expandable "show the working"
           so the diver can spot a mistyped cylinder pressure vs a bad RMV. -->
      <GasConsumptionBreakdown
        v-if="gasCmp.mismatch"
        :view="gasCmp"
        :dive-start-ms="dive.summary.start"
      />

      <!-- CCR dive: no whole-dive RMV/total to reconcile, but the bailout RMV (open-circuit portion
           only) + injected O2/diluent litres are worth showing the working for. -->
      <CcrGasBreakdown
        v-else-if="showCcrBreakdown"
        :cc="dive.cylinderConsumption!"
        :dive-start-ms="dive.summary.start"
      />

      <!-- Cylinders - the one piece of Configuration dense enough to keep its own panel; Suit/Base
           Config/CCR Unit/Weight/Visibility/Gas Consumption moved into the compact InfoCardRow
           above. One compact line per cylinder (label · label · ...) rather than a padded
           sub-card with a 2-line label/value grid for each field - a sidemount/CCR dive with
           several cylinders no longer dominates the page. -->
      <div
        v-if="dive.configuration?.cylinders?.length"
        class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 md:p-4"
      >
        <h2 class="text-sm font-semibold mb-2">Cylinders</h2>
        <div class="divide-y divide-gray-100 dark:divide-gray-700 text-xs">
          <div
            v-for="(cylinder, idx) in dive.configuration.cylinders"
            :key="idx"
            class="flex flex-wrap items-center gap-x-2 gap-y-0.5 py-1.5"
          >
            <span class="font-semibold">
              {{ cylinder.size.value }} {{ cylinder.size.unit === 'LITER' ? 'l' : 'cf' }}
            </span>
            <template v-if="cylinder.material">
              <span class="text-gray-400 dark:text-gray-500">&middot;</span>
              <span>{{ CYLINDER_MATERIAL_LABELS[cylinder.material] }}</span>
            </template>
            <span class="text-gray-400 dark:text-gray-500">&middot;</span>
            <span>{{ Math.round(cylinder.gas.o2 * 100) }}/{{ Math.round(cylinder.gas.he * 100) }}</span>
            <span class="text-gray-400 dark:text-gray-500">&middot;</span>
            <span class="text-gray-600 dark:text-gray-400">{{
              CYLINDER_ROLE_LABELS[cylinder.role]
            }}</span>
            <template v-if="cylinder.startBar !== undefined && cylinder.startBar !== null">
              <span class="text-gray-400 dark:text-gray-500">&middot;</span>
              <span
                >{{ cylinder.startBar
                }}<template v-if="cylinder.endBar !== undefined && cylinder.endBar !== null"
                  >&rarr;{{ cylinder.endBar }}</template
                >
                bar</span
              >
            </template>
            <template v-else-if="cylinder.endBar !== undefined && cylinder.endBar !== null">
              <span class="text-gray-400 dark:text-gray-500">&middot;</span>
              <span>&rarr;{{ cylinder.endBar }} bar</span>
            </template>
            <template v-if="cylinder.notes">
              <span class="text-gray-400 dark:text-gray-500">&middot;</span>
              <span class="text-gray-500 dark:text-gray-400 italic">{{ cylinder.notes }}</span>
            </template>
            <!-- Usage windows: only rendered when set (most cylinders have none = whole dive). -->
            <template v-for="(window, wi) in cylinder.usageWindows" :key="`w-${wi}`">
              <span class="text-gray-400 dark:text-gray-500">&middot;</span>
              <span class="text-gray-500 dark:text-gray-400">
                {{ usageWindowLabel(window.start) }}&ndash;{{ usageWindowLabel(window.end) }}
              </span>
            </template>
          </div>
        </div>
      </div>

      <!-- Notes Panel -->
      <div
        v-if="dive.notes"
        class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6"
      >
        <h2 class="text-lg font-semibold mb-3">Notes</h2>
        <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ dive.notes }}</p>
      </div>

      <!-- Photo Gallery (WS4) - always the very last thing on the page, after Notes - all
           gallery logic lives inside the component itself. -->
      <DivePhotoGallery :dive-id="dive.id" :read-only="readOnly || !isMine" />
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
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import { formatISoDurationToTime, formatDate, elapsedMinutesSeconds } from '@/lib/utils/timeUtils'
import DiveSiteMap from '@/components/DiveSiteMap.vue'
import DiveSearchAndLink from '@/components/DiveSearchAndLink.vue'
import DiveGraphContainer from '@/components/dive/view/DiveGraphContainer.vue'
import GasDisplay from '@/components/dive/view/GasDisplay.vue'
import InfoCard from '@/components/InfoCard.vue'
import InfoCardRow from '@/components/InfoCardRow.vue'
import SharePopover from '@/components/share/SharePopover.vue'
import DeletionConfirmation from '@/components/DeletionConfirmation.vue'
import ProfileReimportModal from '@/components/dive/view/ProfileReimportModal.vue'
import DivePhotoGallery from '@/components/dive/DivePhotoGallery.vue'
import GasConsumptionBreakdown from '@/components/dive/GasConsumptionBreakdown.vue'
import CcrGasBreakdown from '@/components/dive/CcrGasBreakdown.vue'
import type { Dive, DiveComputer } from '@/lib/types/dive'
import {
  BASE_CONFIGURATION_LABELS,
  SUIT_TYPE_LABELS,
  CYLINDER_ROLE_LABELS,
  CYLINDER_MATERIAL_LABELS,
  WATER_TYPE_LABELS,
  BUDDY_ROLE_LABELS,
  type TeamTerminology,
} from '@/lib/types/dive'
import { gasConsumptionComparison } from '@/lib/dive/gasConsumption'
import type { DiveTrip } from '@/lib/types/trip'
import { useTeamTerminology } from '@/composables/useTeamTerminology'
import { computeGasList, isGaugeModeProfile, type GasListEntry } from '@/lib/dive/gasRoles'
import { metricCoverage, coverageNote } from '@/lib/dive/profileMetrics'
import { detectTrimSuggestion } from '@/lib/graph/trimSuggestion'
import TagBadge from '@/components/dive/TagBadge.vue'
import type { User } from '@/lib/types/user'
import { useProfileReimportStore } from '@/stores/profileReimport'
import { storeToRefs } from 'pinia'
import { useReadOnlyMode } from '@/composables/useReadOnlyMode'
import { isTypingTarget } from '@/lib/shortcuts/typingTarget'
import { googleMapsUrl } from '@/lib/map/googleMapsUrl'

const router = useRouter()
const route = useRoute()
const { getWithToken, deleteWithToken } = useApi()
const profileReimportStore = useProfileReimportStore()
const { requestId: reimportRequestId } = storeToRefs(profileReimportStore)
const { readOnly } = useReadOnlyMode()

const diveId = computed(() => Number(route.params.diveId))
const dive = ref<Dive | null>(null)
// Trips/courses this dive belongs to (GET /v1/dive-trips/for-dive/{id}) - rendered as badges in
// the header. Populated by fetchDiveTrips after the dive loads.
const diveTrips = ref<DiveTrip[]>([])
// The first of this dive's trips that has its own terminology override set, used as
// useTeamTerminology's middle fallback step. Derived from the same fetch as diveTrips.
const diveTripTerminology = ref<TeamTerminology | null>(null)
const { plural: buddyTerminologyPlural } = useTeamTerminology(dive, diveTripTerminology)
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

// Backs the 'g' keyboard shortcut below - the visible link now lives in the map's own popup (see
// DiveSiteMapPopup) instead of a separate on-page button, but the shortcut still needs the URL.
const diveSiteGoogleMapsUrl = computed(() => {
  const site = dive.value?.site
  return site ? googleMapsUrl(site.latitude, site.longitude) : undefined
})

// The suit's own `notes` field doubles as its display name (see SuitManagement.vue/SuitSelector.vue's
// "Name: ..." convention - there's no separate name column) - shown as the primary text, with the
// formatted type as a secondary parenthetical, matching how Dive Computers already shows
// "customIdentifier (manufacturer)". Falls back to just the type (+ thickness) when no name is set.
const suitLabel = computed(() => {
  const suit = dive.value?.configuration?.suit
  const name = suit?.notes?.trim()
  // A suit with no type set yet can still be worth showing if it at least has a name or a
  // thickness - only fully-blank (no name, no type, no thickness) falls through below.
  if (suit && (suit.type || name || suit.thickness != null)) {
    const typeLabel = suit.type ? SUIT_TYPE_LABELS[suit.type] : null
    if (name) return typeLabel ? `${name} (${typeLabel})` : name
    if (typeLabel) return suit.thickness != null ? `${typeLabel} · ${suit.thickness} mm` : typeLabel
    return `${suit.thickness} mm`
  }
  // No specific saved suit to show - fall back to the noted ad-hoc type (e.g. a rental) if any.
  const adHocType = dive.value?.configuration?.adHocSuitType
  return adHocType ? `${SUIT_TYPE_LABELS[adHocType]} (no specific suit)` : ''
})

// Only the real, saved suit is linkable to its own detail page - the ad-hoc fallback above has no
// entity behind it to link to.
const suitIsLinkable = computed(() => {
  const suit = dive.value?.configuration?.suit
  return !!(suit?.id && (suit.type || suit.notes?.trim() || suit.thickness != null))
})

const viewDivesByTag = (tagId: number) => {
  router.push({ name: 'DiveList', query: { tagIds: String(tagId) } })
}

// A manual dive's synthetic profile is attached to a fixed "Manual Entry" dive computer
// (see DiveService.createEmptyDive on the backend) - no dedicated DB flag exists, this is the
// same signal the backend itself uses to build the profile, so it's safe to sniff here too.
const isManualDive = computed(
  () => dive.value?.profiles?.[0]?.diveComputer?.customIdentifier === 'Manual Entry',
)

// Card-level readings (CNS / OTU / GF99) come from the first / last profile that actually *has*
// that metric - not profiles[0]/[last], which is wrong when a backup computer without the metric
// sorts first/last - and carry a coverage warning when the profile data spans far less than the
// logged dive. A gauge-mode computer reports n2=0 for every sample (see isGaugeModeProfile), so
// GF99 is resolved against non-gauge profiles only.
const profileList = computed(() => dive.value?.profiles ?? [])
const nonGaugeProfiles = computed(() => profileList.value.filter((p) => !isGaugeModeProfile(p)))
const cnsCoverage = computed(() =>
  dive.value
    ? metricCoverage(
        profileList.value,
        (s) => s.startCNS,
        (s) => s.endCNS,
        dive.value,
      )
    : null,
)
const otuCoverage = computed(() =>
  dive.value
    ? metricCoverage(
        profileList.value,
        (s) => s.o2Toxicity,
        (s) => s.o2Toxicity,
        dive.value,
      )
    : null,
)
const gf99StartCoverage = computed(() =>
  dive.value
    ? metricCoverage(
        nonGaugeProfiles.value,
        (s) => s.startN2,
        (s) => s.startN2,
        dive.value,
      )
    : null,
)
const showGf99Start = computed(() => gf99StartCoverage.value?.startValue != null)

// Each profile's own surfacing/last GF99 (DiveMeasurement.n2, same value the graph's "GF99"
// metric is drawn from) - the "GF99 @ Surface" card only lists profiles that actually have one,
// excluding gauge-mode computers whose n2 is a flat 0 throughout rather than a real reading.
const profilesWithSurfacingGf = computed(
  () =>
    dive.value?.profiles.filter((p) => p.summary?.endN2 !== undefined && !isGaugeModeProfile(p)) ??
    [],
)

// Water type is a dive-site property; a dive may carry its own override that wins over the site's.
const effectiveWaterType = computed(
  () => dive.value?.waterType ?? dive.value?.site?.waterType ?? null,
)

// Reconciliation of the manually-entered whole-dive gas figures against the RMV/total derived
// from tracked cylinders (Dive.gasConsumptionComparison, computed server-side). Drives the single
// RMV/Total figure shown + the mismatch warning box.
const gasCmp = computed(() =>
  gasConsumptionComparison({ gasConsumptionComparison: dive.value?.gasConsumptionComparison ?? null }),
)

/** RMV to show (+ where it came from): the cylinder-derived figure when available, else the
 * entered one, else the plain cylinder-consumption RMV for a dive with no manual figures. */
const rmvDisplay = computed<{ value: number; source: 'cylinders' | 'entered' | null } | null>(() => {
  const value = gasCmp.value.effectiveRmvLiters ?? dive.value?.cylinderConsumption?.ocRmvLiters ?? null
  if (value == null) return null
  const source =
    gasCmp.value.effectiveRmvSource ??
    (dive.value?.cylinderConsumption?.ocRmvLiters != null ? 'cylinders' : null)
  return { value, source }
})

const totalGasDisplay = computed<number | null>(
  () => gasCmp.value.effectiveTotalLiters ?? dive.value?.gasConsumption?.totalLiters ?? null,
)

const gasSourceNote = (source: 'cylinders' | 'entered' | null): string =>
  source === 'cylinders' ? '· from cylinders' : source === 'entered' ? '· entered' : ''

const hasGasConsumption = computed(() => {
  const cylinderConsumption = dive.value?.cylinderConsumption
  return (
    (dive.value?.gasConsumption?.totalLiters ?? null) !== null ||
    (gasCmp.value.insertedRmvLiters ?? null) !== null ||
    (cylinderConsumption?.ocRmvLiters ?? null) !== null ||
    (cylinderConsumption?.bailoutRmvLiters ?? null) !== null ||
    (cylinderConsumption?.o2Liters ?? null) !== null ||
    (cylinderConsumption?.diluentLiters ?? null) !== null
  )
})

// CCR breakdown: the profile carries open-circuit stretches (mode == OC), or a bailout / O2 /
// diluent figure was computed. The whole-dive GasConsumptionComparison is null for a CCR dive.
const showCcrBreakdown = computed(() => {
  const cc = dive.value?.cylinderConsumption
  if (!cc) return false
  return (
    (cc.openCircuitWindows?.length ?? 0) > 0 ||
    cc.bailoutRmvLiters != null ||
    cc.o2Liters != null ||
    cc.diluentLiters != null
  )
})

/** mm:ss-since-dive-start label for a cylinder usage-window bound (epoch millis or null). */
const usageWindowLabel = (epochMs: number | null | undefined): string => {
  const start = dive.value?.summary.start
  if (epochMs == null || start == null) return '?'
  const parts = elapsedMinutesSeconds(epochMs, start)
  if (!parts) return '?'
  return `${String(parts.minutes).padStart(2, '0')}:${String(parts.seconds).padStart(2, '0')}`
}

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
  const isCcr = !!(currentDive.configuration?.ccrUnit || currentDive.configuration?.secondaryCcrUnit)
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
  // Reset rather than leaving the previous dive's resolved trips/terminology on screen until
  // this dive's own fetchDiveTrips call resolves.
  diveTrips.value = []
  diveTripTerminology.value = null
  try {
    loading.value = true
    const res = await getWithToken<Dive>(`/v1/dives/${requestedDiveId}`)
    if (requestId !== fetchDiveRequestId) return
    dive.value = res.data
    fetchDiveTrips(requestedDiveId)
  } catch (err) {
    if (requestId !== fetchDiveRequestId) return
    error.value = `Failed to fetch dive: ${extractErrorDetail(err)}`
  } finally {
    if (requestId === fetchDiveRequestId) loading.value = false
  }
}

const fetchDiveTrips = async (forDiveId: number) => {
  try {
    const res = await getWithToken<DiveTrip[]>(`/v1/dive-trips/for-dive/${forDiveId}`)
    if (diveId.value !== forDiveId) return
    diveTrips.value = res.data
    diveTripTerminology.value = res.data.find((t) => t.teamTerminology)?.teamTerminology ?? null
  } catch {
    // A stale request's failure (e.g. the user has since navigated to a different dive) must
    // never clobber whatever the now-current dive's fetch already resolved.
    if (diveId.value !== forDiveId) return
    diveTrips.value = []
    diveTripTerminology.value = null
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
    toast.error(`Failed to delete profile: ${extractErrorDetail(err)}`)
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
    toast.error(`Failed to delete dive: ${extractErrorDetail(err)}`)
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
  // Escape closes the Link/Share modals (DeletionConfirmation and ProfileReimportModal already
  // handle their own Escape) - checked before the input/textarea guard below since Escape should
  // still close a modal even if focus landed in a field inside it.
  if (event.key === 'Escape') {
    if (showLinkModal.value) {
      showLinkModal.value = false
      return
    }
    if (showShareModal.value) {
      showShareModal.value = false
      return
    }
  }

  // Don't trigger shortcuts when typing in input/textarea
  if (isTypingTarget(event.target)) {
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
  // 'n'/'p' (or ←/→) for next/previous dive by number in your own dive log - see adjacentDives'
  // own comment for why this is isMine-only. No-op at either end (adjacentDives.value is null
  // there), same convention as the dive list/stats page-forward/back shortcuts elsewhere in the
  // app. Arrow keys are an alias for the same action, not a separate one - many people reach for
  // them before letters.
  const wantsNext = event.key.toLowerCase() === 'n' || event.key === 'ArrowRight'
  const wantsPrevious = event.key.toLowerCase() === 'p' || event.key === 'ArrowLeft'
  if (wantsNext && !event.ctrlKey && !event.metaKey && isMine.value) {
    const nextId = adjacentDives.value?.nextDiveId
    if (nextId != null) {
      router.push({ name: 'DiveView', params: { diveId: nextId } })
    }
  }
  if (wantsPrevious && !event.ctrlKey && !event.metaKey && isMine.value) {
    const previousId = adjacentDives.value?.previousDiveId
    if (previousId != null) {
      router.push({ name: 'DiveView', params: { diveId: previousId } })
    }
  }
  // 'g' opens the dive site in Google Maps - same destination as the link inside the map's own
  // popup, just reachable without a mouse. window.open (not location.href) so it opens a new
  // tab/app rather than navigating away from the dive itself.
  if (
    event.key.toLowerCase() === 'g' &&
    !event.ctrlKey &&
    !event.metaKey &&
    diveSiteGoogleMapsUrl.value
  ) {
    window.open(diveSiteGoogleMapsUrl.value, '_blank', 'noopener,noreferrer')
  }
  // 'c' copies a shareable link to this dive to the clipboard.
  if (event.key.toLowerCase() === 'c' && !event.ctrlKey && !event.metaKey) {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast.success('Link copied to clipboard'))
      .catch(() => toast.error('Could not copy link'))
  }
  // 'r' opens the "Refine with another file" (reimport profile) tool directly - also reachable
  // via the button in the Dive Profile card header and the Command Palette. Same guard as the
  // reimportRequestId watcher below (own dive, unlocked, has at least one profile to reimport).
  if (
    event.key.toLowerCase() === 'r' &&
    !event.ctrlKey &&
    !event.metaKey &&
    isMine.value &&
    !readOnly.value &&
    dive.value?.profiles?.length
  ) {
    showReimportModal.value = true
  }
  // 1-9 jump the graph's "Tooltip Profile" selection straight to that profile, same as clicking
  // its numbered button in MetricsControlPanel - only meaningful once a dive has more than one.
  if (/^[1-9]$/.test(event.key) && !event.ctrlKey && !event.metaKey) {
    const profiles = dive.value?.profiles
    if (profiles && profiles.length > 1) {
      embeddedGraphRef.value?.selectTooltipProfile(Number(event.key) - 1)
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
