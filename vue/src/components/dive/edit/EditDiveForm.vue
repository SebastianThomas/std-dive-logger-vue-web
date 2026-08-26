<template>
  <div>
    <h2 class="text-xl font-semibold mb-4">Dive Information</h2>
    <form class="space-y-4">
      <!-- Dive Number -->
      <div>
        <label for="dive-number" class="block mb-2 font-medium">Dive Number</label>
        <input
          id="dive-number"
          :value="modelValue.diveNumber ?? ''"
          type="number"
          class="w-full p-2 border rounded"
          placeholder="Enter dive number"
          required
          @input="updateField('diveNumber', Number(($event.target as HTMLInputElement).value))"
        />
      </div>

      <!-- Dive Name -->
      <div>
        <label for="dive-name" class="block mb-2 font-medium">Dive Name</label>
        <input
          id="dive-name"
          :value="modelValue.diveName ?? ''"
          type="text"
          class="w-full p-2 border rounded"
          placeholder="Enter name of your dive"
          @input="updateField('diveName', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <!-- Location -->
      <div>
        <label for="site-name" class="block mb-2 font-medium">Location</label>
        <div class="flex gap-2 items-start">
          <div class="flex-1">
            <DiveSiteSearch
              :initial-value="modelValue.diveSite?.name ?? ''"
              placeholder="Search dive sites by name..."
              @selected="onSiteSelected"
            />
          </div>
          <button
            type="button"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 whitespace-nowrap"
            @click="showMap = true"
          >
            Choose on Map
          </button>
        </div>
        <p v-if="modelValue.diveSite" class="text-sm mt-1 text-gray-600 dark:text-gray-400">
          Selected: {{ modelValue.diveSite.name }} ({{ modelValue.diveSite.latitude.toFixed(5) }},
          {{ modelValue.diveSite.longitude.toFixed(5) }})
        </p>
      </div>

      <!-- Dive Buddies -->
      <div>
        <label for="buddies" class="block mb-2 font-medium">{{ terminologyPlural }}</label>
        <ul v-if="(modelValue.diveBuddies || []).length" class="mb-2 space-y-1">
          <li
            v-for="buddy in modelValue.diveBuddies || []"
            :key="buddy.name"
            class="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg text-sm"
          >
            <span class="flex-1">{{ buddy.name }}</span>
            <select
              :value="buddy.role ?? ''"
              class="text-xs p-1 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              @change="
                setBuddyRole(buddy.name, ($event.target as HTMLSelectElement).value as BuddyRole | '')
              "
            >
              <option value="">No role</option>
              <option v-for="(label, role) in BUDDY_ROLE_LABELS" :key="role" :value="role">
                {{ label }}
              </option>
            </select>
            <button
              type="button"
              class="text-red-500 font-bold hover:text-red-700"
              @click="removeBuddy(buddy.name)"
            >
              ×
            </button>
          </li>
        </ul>
        <BuddyNameAutocomplete
          id="buddies"
          v-model="buddyInput"
          :placeholder="`Enter a ${terminologySingular.toLowerCase()} and press Enter`"
          :exclude-names="(modelValue.diveBuddies || []).map((b) => b.name)"
          @select="addBuddyByName"
          @enter="addBuddy"
        />
      </div>

      <!-- Dive leader: only already-saved buddies/linked dives are selectable here - a buddy just
           typed in this session has no id yet to reference until saved once. -->
      <div>
        <label for="dive-leader" class="block mb-2 font-medium">Who Led This Dive?</label>
        <select
          id="dive-leader"
          :value="leaderSelectValue"
          class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
          @change="updateLeader(($event.target as HTMLSelectElement).value)"
        >
          <option value="unset">Not set</option>
          <option value="self">Me</option>
          <option
            v-for="buddy in leaderSelectableNamedBuddies"
            :key="`named-${buddy.id}`"
            :value="`named:${buddy.id}`"
          >
            {{ buddy.name }}
          </option>
          <option
            v-for="linked in existingBuddyDives || []"
            :key="`linked-${linked.diveId}`"
            :value="`linked:${linked.diveId}`"
          >
            {{ linked.buddy.name }}
          </option>
        </select>
        <p
          v-if="(modelValue.diveBuddies || []).some((b) => !isExistingBuddy(b.name))"
          class="text-xs text-gray-500 dark:text-gray-400 mt-1"
        >
          A newly-added buddy can be set as leader after this dive is saved once.
        </p>
      </div>

      <!-- Buddy/team terminology -->
      <div>
        <label for="team-terminology" class="block mb-2 font-medium">Wording</label>
        <select
          id="team-terminology"
          :value="modelValue.teamTerminology ?? ''"
          class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
          @change="
            updateField(
              'teamTerminology',
              ($event.target as HTMLSelectElement).value
                ? (($event.target as HTMLSelectElement).value as TeamTerminology)
                : null,
            )
          "
        >
          <option value="">Default (Buddy)</option>
          <option value="BUDDY">Buddy</option>
          <option value="TEAM">Team</option>
        </select>
      </div>

      <!-- Slot for caller to inject content between Buddies and Notes (e.g. Tags) -->
      <slot />

      <!-- Notes -->
      <div>
        <label for="notes" class="block mb-2 font-medium">Notes</label>
        <textarea
          id="notes"
          :value="modelValue.notes ?? ''"
          rows="4"
          class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
          placeholder="Add any notes about this dive..."
          @input="updateField('notes', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <!-- Visibility -->
      <fieldset v-if="modelValue.visibility" class="border rounded p-4">
        <legend class="font-medium mb-3">Visibility</legend>
        <div class="space-y-3">
          <div>
            <label for="visibility-feeling" class="block mb-2">Feeling</label>
            <select
              id="visibility-feeling"
              :value="modelValue.visibility.feeling ?? ''"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              @change="updateVisibilityField('feeling', ($event.target as HTMLSelectElement).value)"
            >
              <option value="HIGH">High</option>
              <option value="AVERAGE">Average</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div>
            <label for="visibility-meters" class="block mb-2">Distance (meters)</label>
            <input
              id="visibility-meters"
              :value="modelValue.visibility.meters ?? ''"
              type="number"
              step="0.1"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              placeholder="Optional"
              @input="handleNumberInput('visibility.meters', $event)"
            />
          </div>
          <div>
            <label for="visibility-description" class="block mb-2">Description</label>
            <input
              id="visibility-description"
              :value="modelValue.visibility.description ?? ''"
              type="text"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              placeholder="Optional description"
              @input="
                updateVisibilityField('description', ($event.target as HTMLInputElement).value)
              "
            />
          </div>
        </div>
      </fieldset>

      <!-- Water Type & Current: unlike Visibility/GasConsumption, these are genuinely optional and
           not pre-created on every dive, so this fieldset always renders rather than being gated
           on an already-non-null value. -->
      <fieldset class="border rounded p-4">
        <legend class="font-medium mb-3">Water Type & Current</legend>
        <div class="space-y-3">
          <div>
            <label for="water-type" class="block mb-2">Water Type</label>
            <select
              id="water-type"
              :value="modelValue.waterType ?? ''"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              @change="
                updateField(
                  'waterType',
                  ($event.target as HTMLSelectElement).value
                    ? (($event.target as HTMLSelectElement).value as WaterType)
                    : null,
                )
              "
            >
              <option value="">Unspecified</option>
              <option value="SALT">Salt</option>
              <option value="FRESH">Fresh</option>
              <option value="BRACKISH">Brackish</option>
            </select>
          </div>
          <div>
            <label for="current-feeling" class="block mb-2">Current Strength (0-5)</label>
            <input
              id="current-feeling"
              :value="modelValue.current?.feeling ?? ''"
              type="number"
              min="0"
              max="5"
              step="1"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              placeholder="Optional"
              @input="handleNumberInput('current.feeling', $event)"
            />
          </div>
          <div>
            <label for="current-knots" class="block mb-2">Current Speed (knots)</label>
            <input
              id="current-knots"
              :value="modelValue.current?.knots ?? ''"
              type="number"
              min="0"
              step="0.1"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              placeholder="Optional"
              @input="handleNumberInput('current.knots', $event)"
            />
          </div>
          <div>
            <label for="current-description" class="block mb-2">Description</label>
            <input
              id="current-description"
              :value="modelValue.current?.description ?? ''"
              type="text"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              placeholder="Optional description"
              @input="
                updateCurrentField('description', ($event.target as HTMLInputElement).value)
              "
            />
          </div>
        </div>
      </fieldset>

      <!-- Configuration -->
      <fieldset v-if="modelValue.configuration" class="border rounded p-4 space-y-4">
        <legend class="font-medium mb-3">Configuration</legend>

        <!-- Suit (managed via external entity) -->
        <div class="border-t pt-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium">Suit</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Select an existing suit or create a new one.
              </p>
            </div>
            <button
              type="button"
              class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              @click="showSuitModal = true"
            >
              Choose / Create Suit
            </button>
          </div>

          <div v-if="modelValue.configuration.suit" class="mt-3 text-sm space-y-1">
            <div>
              <span class="font-semibold">Type:</span>
              {{ suitTypeLabel(modelValue.configuration.suit.type) }}
            </div>
            <div
              v-if="
                modelValue.configuration.suit.thickness !== undefined &&
                modelValue.configuration.suit.thickness !== null
              "
            >
              <span class="font-semibold">Thickness:</span>
              {{ modelValue.configuration.suit.thickness }} mm
            </div>
            <div v-if="modelValue.configuration.suit.notes">
              <span class="font-semibold">Name:</span>
              {{ formatSuitNotesPreview(modelValue.configuration.suit.notes) }}
            </div>
          </div>

          <div v-if="!hasMeaningfulSuit" class="mt-3">
            <label
              for="ad-hoc-suit-type"
              class="block mb-2 text-sm text-gray-600 dark:text-gray-400"
            >
              No specific suit? Note the type instead (e.g. a rental)
            </label>
            <select
              id="ad-hoc-suit-type"
              :value="modelValue.configuration.adHocSuitType ?? ''"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              @change="updateAdHocSuitType(($event.target as HTMLSelectElement).value)"
            >
              <option value="">Not specified</option>
              <option v-for="(label, type) in SUIT_TYPE_LABELS" :value="type" :key="type">
                {{ label }}
              </option>
            </select>
          </div>
        </div>

        <!-- Base Configuration -->
        <div class="border-t pt-4">
          <div>
            <label for="base-config" class="block mb-2">Base Configuration</label>
            <select
              id="base-config"
              :value="modelValue.configuration.base ?? BASE_CONFIGURATION_LABELS['OTHER']"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              @change="updateConfigField('base', ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="(c, k) in BASE_CONFIGURATION_LABELS" :value="k" :key="k">
                {{ c }}
              </option>
            </select>
          </div>
        </div>

        <!-- CCR Unit (only relevant for CCR rigs; managed via external entity like Suit) -->
        <div v-if="isCcrBaseConfiguration(modelValue.configuration.base)" class="border-t pt-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium">CCR Unit</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Select an existing rebreather or create a new one. Optional.
              </p>
            </div>
            <button
              type="button"
              class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              @click="showCcrUnitModal = true"
            >
              Choose / Create CCR Unit
            </button>
          </div>

          <div v-if="modelValue.configuration.ccrUnit" class="mt-3 text-sm space-y-1">
            <div>
              <span class="font-semibold">Name:</span>
              {{ modelValue.configuration.ccrUnit.name }}
            </div>
            <div v-if="modelValue.configuration.ccrUnit.notes">
              <span class="font-semibold">Notes:</span>
              {{ formatSuitNotesPreview(modelValue.configuration.ccrUnit.notes) }}
            </div>
          </div>
          <p v-else class="mt-3 text-sm text-gray-500 dark:text-gray-400">
            No CCR unit selected.
          </p>
        </div>

        <!-- Weight -->
        <div class="border-t pt-4 space-y-3">
          <div>
            <label for="weight" class="block mb-2">Weight (kg)</label>
            <input
              id="weight"
              :value="modelValue.configuration.weight ?? ''"
              type="number"
              step="0.5"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              @input="handleNumberInput('configuration.weight', $event)"
            />
          </div>
          <div v-if="modelValue.configuration.weightFeeling">
            <label for="weight-feeling" class="block mb-2">Weight Feeling</label>
            <select
              id="weight-feeling"
              :value="modelValue.configuration.weightFeeling ?? ''"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              @change="
                updateConfigField('weightFeeling', ($event.target as HTMLSelectElement).value)
              "
            >
              <option value="">None</option>
              <option value="LIGHT">Light</option>
              <option value="GOOD">Good</option>
              <option value="HEAVY">Heavy</option>
            </select>
          </div>
        </div>

        <!-- Cylinders: size/pressures/gas mix/role, used to compute real RMV (see the RMV/Bailout
             RMV/O2/Diluent figures on the dive view page) instead of the manually-entered
             whole-dive SAC/RMV above, which can't account for cylinder size or CCR at all. -->
        <div class="border-t pt-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-medium">Cylinders</h3>
            <button
              type="button"
              class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              @click="addCylinder"
            >
              Add Cylinder
            </button>
          </div>
          <p
            v-if="!modelValue.configuration.cylinders?.length"
            class="text-sm text-gray-500 dark:text-gray-400"
          >
            No cylinders tracked - RMV can't be computed without at least one.
          </p>
          <div
            v-for="(cylinder, index) in modelValue.configuration.cylinders"
            :key="cylinder.id"
            class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2"
          >
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label class="block text-xs mb-1">Size (l)</label>
                <input
                  :value="cylinder.size.value"
                  type="number"
                  step="0.1"
                  class="w-full p-1.5 text-sm border rounded dark:bg-gray-800 dark:text-white dark:border-gray-600"
                  @input="updateCylinderSizeValue(index, $event)"
                />
              </div>
              <div>
                <label class="block text-xs mb-1">Start (bar)</label>
                <input
                  :value="cylinder.startBar ?? ''"
                  type="number"
                  step="1"
                  class="w-full p-1.5 text-sm border rounded dark:bg-gray-800 dark:text-white dark:border-gray-600"
                  @input="updateCylinderNumberField(index, 'startBar', $event)"
                />
              </div>
              <div>
                <label class="block text-xs mb-1">End (bar)</label>
                <input
                  :value="cylinder.endBar ?? ''"
                  type="number"
                  step="1"
                  class="w-full p-1.5 text-sm border rounded dark:bg-gray-800 dark:text-white dark:border-gray-600"
                  @input="updateCylinderNumberField(index, 'endBar', $event)"
                />
              </div>
              <div>
                <label class="block text-xs mb-1">Role</label>
                <select
                  v-if="isCcrBaseConfiguration(modelValue.configuration.base)"
                  :value="cylinder.role"
                  class="w-full p-1.5 text-sm border rounded dark:bg-gray-800 dark:text-white dark:border-gray-600"
                  @change="
                    updateCylinderRole(
                      index,
                      ($event.target as HTMLSelectElement).value as CylinderRole,
                    )
                  "
                >
                  <!-- A cylinder already carrying a role outside Diluent/O2/Bailout (e.g. stale
                       "OC" from before this restriction existed, or from a mode switch) still
                       shows its real stored value here rather than going blank - it just isn't
                       offered as a choice for a cylinder that doesn't already have it. -->
                  <option
                    v-if="!CCR_CYLINDER_ROLES.includes(cylinder.role)"
                    :value="cylinder.role"
                  >
                    {{ CYLINDER_ROLE_LABELS[cylinder.role] }}
                  </option>
                  <option v-for="role in CCR_CYLINDER_ROLES" :key="role" :value="role">
                    {{ CYLINDER_ROLE_LABELS[role] }}
                  </option>
                </select>
                <!-- OC dives only ever have one sensible role - shown fixed, not a real dropdown,
                     rather than offering CCR-only choices (Diluent/O2/Bailout) that don't apply. -->
                <input
                  v-else
                  :value="CYLINDER_ROLE_LABELS[cylinder.role]"
                  type="text"
                  disabled
                  class="w-full p-1.5 text-sm border rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 dark:border-gray-600 cursor-not-allowed"
                />
              </div>
              <div>
                <label class="block text-xs mb-1">O2 %</label>
                <input
                  :value="Math.round(cylinder.gas.o2 * 100)"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  class="w-full p-1.5 text-sm border rounded dark:bg-gray-800 dark:text-white dark:border-gray-600"
                  @input="updateCylinderGasField(index, 'o2', $event)"
                />
              </div>
              <div>
                <label class="block text-xs mb-1">He %</label>
                <input
                  :value="Math.round(cylinder.gas.he * 100)"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  class="w-full p-1.5 text-sm border rounded dark:bg-gray-800 dark:text-white dark:border-gray-600"
                  @input="updateCylinderGasField(index, 'he', $event)"
                />
              </div>
              <div class="col-span-2">
                <label class="block text-xs mb-1">Notes</label>
                <input
                  :value="cylinder.notes ?? ''"
                  type="text"
                  class="w-full p-1.5 text-sm border rounded dark:bg-gray-800 dark:text-white dark:border-gray-600"
                  @input="
                    updateCylinderField(index, 'notes', ($event.target as HTMLInputElement).value)
                  "
                />
              </div>
            </div>
            <p
              v-if="cylinder.gas.o2 + cylinder.gas.he > 1.001"
              class="text-xs text-red-600 dark:text-red-400"
            >
              O2 + He can't exceed 100% (currently
              {{ Math.round((cylinder.gas.o2 + cylinder.gas.he) * 100) }}%) - the rest is implied
              to be N2, so this would go negative.
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Leave usage start/end unset if this cylinder was used for the whole dive - the
              common case, needing no extra data entry. Only set these if more than one cylinder
              of this same role was used across the dive (e.g. a twinset switch, or a bailout
              stage only breathed during part of the ascent) and you know the actual clock times.
            </p>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs mb-1">Usage Start (mm:ss since dive start)</label>
                <div class="flex items-center gap-1">
                  <input
                    :value="elapsedMinutesSeconds(cylinder.usageStart, diveStart)?.minutes ?? ''"
                    type="number"
                    min="0"
                    placeholder="mm"
                    class="w-full p-1.5 text-sm border rounded dark:bg-gray-800 dark:text-white dark:border-gray-600"
                    @input="updateCylinderUsageElapsed(index, 'usageStart', 'minutes', $event)"
                  />
                  <span class="text-sm text-gray-500">:</span>
                  <input
                    :value="elapsedMinutesSeconds(cylinder.usageStart, diveStart)?.seconds ?? ''"
                    type="number"
                    min="0"
                    max="59"
                    placeholder="ss"
                    class="w-full p-1.5 text-sm border rounded dark:bg-gray-800 dark:text-white dark:border-gray-600"
                    @input="updateCylinderUsageElapsed(index, 'usageStart', 'seconds', $event)"
                  />
                </div>
              </div>
              <div>
                <label class="block text-xs mb-1">Usage End (mm:ss since dive start)</label>
                <div class="flex items-center gap-1">
                  <input
                    :value="elapsedMinutesSeconds(cylinder.usageEnd, diveStart)?.minutes ?? ''"
                    type="number"
                    min="0"
                    placeholder="mm"
                    class="w-full p-1.5 text-sm border rounded dark:bg-gray-800 dark:text-white dark:border-gray-600"
                    @input="updateCylinderUsageElapsed(index, 'usageEnd', 'minutes', $event)"
                  />
                  <span class="text-sm text-gray-500">:</span>
                  <input
                    :value="elapsedMinutesSeconds(cylinder.usageEnd, diveStart)?.seconds ?? ''"
                    type="number"
                    min="0"
                    max="59"
                    placeholder="ss"
                    class="w-full p-1.5 text-sm border rounded dark:bg-gray-800 dark:text-white dark:border-gray-600"
                    @input="updateCylinderUsageElapsed(index, 'usageEnd', 'seconds', $event)"
                  />
                </div>
              </div>
            </div>
            <!-- Suggested from the primary computer's own gas-switch history: only offered while
                 Usage Start/End are both still unset, so it never second-guesses a value the
                 diver already entered. The first (longest) match fills this row directly; any
                 other matching window is offered as its own extra cylinder row, since one row can
                 only hold one window. -->
            <div
              v-if="!cylinder.usageStart && !cylinder.usageEnd && cylinderSuggestions[index]?.length"
              class="text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2 space-y-1"
            >
              <p class="text-blue-800 dark:text-blue-200">
                This gas matches the primary computer's log during:
              </p>
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="(window, wIndex) in cylinderSuggestions[index]"
                  :key="wIndex"
                  type="button"
                  class="px-2 py-1 rounded border"
                  :class="
                    wIndex === 0
                      ? 'border-blue-500 bg-blue-100 dark:bg-blue-800/40 text-blue-900 dark:text-blue-100 font-medium'
                      : 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/30'
                  "
                  @click="applySuggestedWindow(index, window, wIndex === 0)"
                >
                  {{ formatElapsedRange(window) }}{{ wIndex === 0 ? ' (suggested)' : '' }}
                </button>
              </div>
            </div>
            <button
              type="button"
              class="text-xs text-red-600 hover:text-red-700"
              @click="removeCylinder(index)"
            >
              Remove cylinder
            </button>
          </div>
        </div>
      </fieldset>

      <!-- Average Depth: only editable for a manually-entered dive, which has no real
           depth-time profile to compute one from (its synthetic surface/max-depth/surface
           samples aren't a real dive shape) - genuinely unknown unless entered here. A dive
           with a real computer profile always has this computed automatically instead. -->
      <fieldset v-if="isManualDive" class="border rounded p-4">
        <legend class="font-medium mb-3">Average Depth</legend>
        <div>
          <label for="average-depth" class="block mb-2"
            >Average Depth (m) - only if known, leave blank otherwise</label
          >
          <input
            id="average-depth"
            :value="modelValue.averageDepth ?? ''"
            type="number"
            step="0.1"
            min="0"
            class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
            @input="handleNumberInput('averageDepth', $event)"
          />
        </div>
      </fieldset>

      <!-- Gas Consumption: whole-dive manually-entered SAC/RMV, placed right after Cylinders since
           that's the more precise per-cylinder alternative to this figure (see the RMV/Bailout
           RMV/O2/Diluent figures on the dive view page, computed from cylinders when tracked). -->
      <fieldset v-if="modelValue.gasConsumption" class="border rounded p-4">
        <legend class="font-medium mb-3">Gas Consumption</legend>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label for="sac-bar" class="block mb-2">SAC (bar/min)</label>
            <input
              id="sac-bar"
              :value="modelValue.gasConsumption.sacBar ?? ''"
              type="number"
              step="0.01"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              @input="handleNumberInput('gasConsumption.sacBar', $event)"
            />
          </div>
          <div>
            <label for="rmv-liters" class="block mb-2">RMV (l/min)</label>
            <input
              id="rmv-liters"
              :value="modelValue.gasConsumption.rmvLiters ?? ''"
              type="number"
              step="0.01"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              @input="handleNumberInput('gasConsumption.rmvLiters', $event)"
            />
          </div>
          <div>
            <label for="total-liters" class="block mb-2">Total Gas (l)</label>
            <input
              id="total-liters"
              :value="modelValue.gasConsumption.totalLiters ?? ''"
              type="number"
              step="0.1"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              @input="handleNumberInput('gasConsumption.totalLiters', $event)"
            />
          </div>
        </div>
      </fieldset>
    </form>

    <!-- Suit modal -->
    <SuitSelector
      v-if="showSuitModal"
      :current-suit="modelValue.configuration?.suit ?? null"
      :user-id="userId"
      @suit-selected="handleSuitSelected"
      @close="showSuitModal = false"
    />

    <!-- CCR Unit modal -->
    <CcrUnitSelector
      v-if="showCcrUnitModal"
      :current-ccr-unit="modelValue.configuration?.ccrUnit ?? null"
      @ccr-unit-selected="handleCcrUnitSelected"
      @close="showCcrUnitModal = false"
    />

    <!-- Map Modal -->
    <div
      v-if="showMap"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="showMap = false"
    >
      <div
        class="w-[90vw] h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-lg relative overflow-hidden p-4"
      >
        <div class="flex justify-between items-center mb-2">
          <div v-if="selectedCoords" class="text-sm">
            <strong>Selected:</strong> {{ selectedCoords.lat.toFixed(5) }},
            {{ selectedCoords.lon.toFixed(5) }}
          </div>
          <div class="flex gap-2">
            <button
              v-if="selectedCoords"
              class="px-4 py-2 bg-green-600 text-white rounded shadow-md hover:bg-green-700"
              @click="handleMapConfirm"
            >
              Use this location
            </button>
            <button
              class="px-4 py-2 bg-red-500 text-white rounded shadow-md hover:bg-red-600"
              @click="showMap = false"
            >
              Close
            </button>
          </div>
        </div>
        <DiveSiteMapPicker
          :initial-coords="
            modelValue.diveSite
              ? { lat: modelValue.diveSite.latitude, lon: modelValue.diveSite.longitude }
              : undefined
          "
          @select="handleMapClick"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import DiveSiteMapPicker from '@/components/DiveSiteMapPicker.vue'
import DiveSiteSearch from '@/components/DiveSiteSearch.vue'
import BuddyNameAutocomplete from '@/components/dive/BuddyNameAutocomplete.vue'
import SuitSelector from '@/components/dive/edit/SuitSelector.vue'
import CcrUnitSelector from '@/components/dive/edit/CcrUnitSelector.vue'
import {
  type DiveSite,
  type Visibility,
  type WaterType,
  type Current,
  type GasConsumption,
  type DiveConfiguration,
  type DiveConfigurationCylinder,
  type CylinderRole,
  type Suit,
  type SuitType,
  type CcrUnit,
  type Dive,
  type DiveProfile,
  type PagedResult,
  type BuddyRole,
  type TeamTerminology,
  type NamedBuddy,
  BASE_CONFIGURATION_LABELS,
  suitTypeLabel,
  SUIT_TYPE_LABELS,
  CYLINDER_ROLE_LABELS,
  CCR_CYLINDER_ROLES,
  BUDDY_ROLE_LABELS,
  isCcrBaseConfiguration,
} from '@/lib/types/dive'
import type { User } from '@/lib/types/user'
import { elapsedMinutesSeconds, epochFromElapsedMinutesSeconds } from '@/lib/utils/timeUtils'
import { findGasMatchWindows, primaryProfile, type UsageWindow } from '@/lib/dive/cylinderUsageWindows'

export interface EditableNamedBuddy {
  name: string
  role?: BuddyRole | null
}

interface DiveFormData {
  diveNumber?: number
  diveName?: string
  diveSite?: DiveSite | null
  diveBuddies?: EditableNamedBuddy[]
  notes?: string
  visibility?: Visibility | null
  waterType?: WaterType | null
  current?: Current | null
  gasConsumption?: GasConsumption | null
  configuration?: DiveConfiguration | null
  leaderNamedBuddyId?: number | null
  leaderBuddyDiveId?: number | null
  leaderSelfExplicit?: boolean
  teamTerminology?: TeamTerminology | null
  averageDepth?: number | null
}

const props = defineProps<{
  modelValue: DiveFormData
  userId: number
  /** Already-persisted named buddies (with real ids) - only these can be picked as the dive
   * leader, since a brand-new buddy added in this editing session has no id yet (see the leader
   * picker's own note below for why). */
  existingNamedBuddies?: NamedBuddy[]
  existingBuddyDives?: { buddy: User; diveId: number }[]
  /** The dive's own start time (epoch millis) - Usage Start/End are edited as minutes:seconds
   * elapsed since this, not an absolute clock time. */
  diveStart: number
  /** Full profile data (with per-sample gas), used only to suggest cylinder Usage windows by
   * finding when the primary computer actually had this gas selected. Undefined/empty just means
   * no suggestions are offered - never required for the form to otherwise function. */
  profiles?: DiveProfile[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DiveFormData]
}>()

const { getWithToken } = useApi()

const showMap = ref(false)
const buddyInput = ref('')
const selectedCoords = ref<{ lat: number; lon: number } | null>(null)
const showSuitModal = ref(false)
const showCcrUnitModal = ref(false)

// Mirrors the "fully-blank hides the card" check in DiveView.vue's suitLabel - only offer the
// ad-hoc type picker once there's genuinely no saved-suit info to show instead, since the two are
// meant to be mutually exclusive in the UI.
const hasMeaningfulSuit = computed(() => {
  const suit = props.modelValue.configuration?.suit
  return !!(suit && (suit.type || suit.notes?.trim() || suit.thickness != null))
})
// Notes preview formatter: first three words, ensure >= 20 chars
const formatSuitNotesPreview = (notes?: string) => {
  const text = (notes ?? '').trim()
  if (!text) return ''
  const words = text.split(/\s+/)
  const firstThree = words.slice(0, 3).join(' ')
  if (firstThree.length >= 20 || words.length <= 3) {
    return firstThree
  }
  let acc = firstThree
  let idx = 3
  while (acc.length < 20 && idx < words.length) {
    acc += ' ' + words[idx]
    idx++
  }
  return acc.length > text.length ? text : acc
}

const updateField = <K extends keyof DiveFormData>(field: K, value: DiveFormData[K]) => {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

const updateSite = (name: string, lat: number, lon: number) => {
  emit('update:modelValue', {
    ...props.modelValue,
    diveSite: { name, latitude: lat, longitude: lon },
  })
}

const onSiteSelected = (site: DiveSite) => {
  updateSite(site.name, site.latitude, site.longitude)
}

const handleMapClick = (coords: { lat: number; lon: number }) => {
  selectedCoords.value = coords
}

const handleMapConfirm = () => {
  if (selectedCoords.value) {
    updateSite(
      props.modelValue.diveSite?.name ?? '',
      selectedCoords.value.lat,
      selectedCoords.value.lon,
    )
    showMap.value = false
    selectedCoords.value = null
  }
}

const hasBuddyNamed = (name: string) =>
  (props.modelValue.diveBuddies ?? []).some((b) => b.name === name)

const isExistingBuddy = (name: string) =>
  (props.existingNamedBuddies ?? []).some((b) => b.name === name)

const addBuddyByName = (name: string) => {
  if (name && !hasBuddyNamed(name)) {
    const newBuddies: EditableNamedBuddy[] = [
      ...(props.modelValue.diveBuddies || []),
      { name, role: null },
    ]
    emit('update:modelValue', { ...props.modelValue, diveBuddies: newBuddies })
  }
  buddyInput.value = ''
}

const addBuddy = () => addBuddyByName(buddyInput.value.trim())

// Only buddies still present in the live (editable) buddy list can be picked as leader - a buddy
// removed from that list this session must also disappear from here, even though
// existingNamedBuddies (the load-time snapshot used to resolve real ids) doesn't itself change.
const leaderSelectableNamedBuddies = computed(() => {
  const liveNames = new Set((props.modelValue.diveBuddies ?? []).map((b) => b.name))
  return (props.existingNamedBuddies ?? []).filter((b) => liveNames.has(b.name))
})

const removeBuddy = (name: string) => {
  const newBuddies = (props.modelValue.diveBuddies || []).filter((b) => b.name !== name)
  const removedWasLeader =
    props.modelValue.leaderNamedBuddyId != null &&
    (props.existingNamedBuddies ?? []).some(
      (b) => b.name === name && b.id === props.modelValue.leaderNamedBuddyId,
    )
  emit('update:modelValue', {
    ...props.modelValue,
    diveBuddies: newBuddies,
    ...(removedWasLeader ? { leaderNamedBuddyId: null } : {}),
  })
}

const setBuddyRole = (name: string, role: BuddyRole | '') => {
  const newBuddies = (props.modelValue.diveBuddies || []).map((b) =>
    b.name === name ? { ...b, role: role || null } : b,
  )
  emit('update:modelValue', { ...props.modelValue, diveBuddies: newBuddies })
}

const terminologyPlural = computed(() =>
  props.modelValue.teamTerminology === 'TEAM' ? 'Team' : 'Buddies',
)
const terminologySingular = computed(() =>
  props.modelValue.teamTerminology === 'TEAM' ? 'Team Member' : 'Buddy',
)

const leaderSelectValue = computed(() => {
  if (props.modelValue.leaderNamedBuddyId != null) {
    return `named:${props.modelValue.leaderNamedBuddyId}`
  }
  if (props.modelValue.leaderBuddyDiveId != null) {
    return `linked:${props.modelValue.leaderBuddyDiveId}`
  }
  return props.modelValue.leaderSelfExplicit ? 'self' : 'unset'
})

const updateLeader = (value: string) => {
  if (value.startsWith('named:')) {
    emit('update:modelValue', {
      ...props.modelValue,
      leaderNamedBuddyId: Number(value.slice('named:'.length)),
      leaderBuddyDiveId: null,
      leaderSelfExplicit: false,
    })
  } else if (value.startsWith('linked:')) {
    emit('update:modelValue', {
      ...props.modelValue,
      leaderNamedBuddyId: null,
      leaderBuddyDiveId: Number(value.slice('linked:'.length)),
      leaderSelfExplicit: false,
    })
  } else if (value === 'self') {
    emit('update:modelValue', {
      ...props.modelValue,
      leaderNamedBuddyId: null,
      leaderBuddyDiveId: null,
      leaderSelfExplicit: true,
    })
  } else {
    emit('update:modelValue', {
      ...props.modelValue,
      leaderNamedBuddyId: null,
      leaderBuddyDiveId: null,
      leaderSelfExplicit: false,
    })
  }
}

// Handle number input to avoid null values being displayed
const handleNumberInput = (path: string, event: Event) => {
  const value = (event.target as HTMLInputElement).value
  const numValue = value === '' ? undefined : Number(value)

  // Split path and navigate to the right place
  const parts = path.split('.')
  if (parts.length === 1) {
    // Top-level field like 'notes'
    updateField(parts[0] as keyof DiveFormData, numValue)
  } else if (parts[0] === 'visibility' && parts[1]) {
    updateVisibilityField(parts[1] as keyof Visibility, numValue)
  } else if (parts[0] === 'current' && parts[1]) {
    updateCurrentField(parts[1] as keyof Current, numValue)
  } else if (parts[0] === 'gasConsumption') {
    updateGasConsumptionField(parts[1] as keyof GasConsumption, numValue)
  } else if (parts[0] === 'configuration') {
    if (parts[1] === 'suit') {
      updateConfigSuitField(parts[2] as keyof Suit, numValue)
    } else {
      updateConfigField(parts[1] as string, numValue)
    }
  }
}

const updateVisibilityField = (field: keyof Visibility, value: string | number | undefined) => {
  emit('update:modelValue', {
    ...props.modelValue,
    visibility: {
      ...props.modelValue.visibility!,
      [field]: value,
    },
  })
}

const updateCurrentField = (field: keyof Current, value: string | number | undefined) => {
  emit('update:modelValue', {
    ...props.modelValue,
    current: {
      ...props.modelValue.current,
      [field]: value,
    },
  })
}

const updateGasConsumptionField = (field: keyof GasConsumption, value: number | undefined) => {
  emit('update:modelValue', {
    ...props.modelValue,
    gasConsumption: {
      ...props.modelValue.gasConsumption!,
      [field]: value !== undefined ? value : 0,
    },
  })
}

const updateConfigField = (field: string, value: string | number | undefined) => {
  emit('update:modelValue', {
    ...props.modelValue,
    configuration: {
      ...props.modelValue.configuration!,
      [field]: value,
    },
  })
}

const emptyCylinder = (): DiveConfigurationCylinder => ({
  // A negative placeholder id, distinct from any real (positive) persisted cylinder id, so the
  // backend's update path can tell "this is a brand new cylinder" apart from "keep this existing
  // one" - matches how a not-yet-saved entity is conventionally represented before its first save.
  id: -Date.now(),
  size: { unit: 'LITER', value: 12 },
  startBar: null,
  endBar: null,
  notes: '',
  gas: { o2: 0.21, he: 0 },
  // OC is the only valid role on an OC dive; on CCR, default to the most common first cylinder
  // (Diluent) rather than OC, which isn't even a selectable option there.
  role: isCcrBaseConfiguration(props.modelValue.configuration?.base ?? 'SINGLE_TANK')
    ? 'DILUENT'
    : 'OC',
  usageStart: null,
  usageEnd: null,
})

const updateCylinders = (cylinders: DiveConfigurationCylinder[]) => {
  emit('update:modelValue', {
    ...props.modelValue,
    configuration: {
      ...props.modelValue.configuration!,
      cylinders,
    },
  })
}

const addCylinder = () => {
  updateCylinders([...(props.modelValue.configuration?.cylinders ?? []), emptyCylinder()])
}

const removeCylinder = (index: number) => {
  const cylinders = [...(props.modelValue.configuration?.cylinders ?? [])]
  cylinders.splice(index, 1)
  updateCylinders(cylinders)
}

const updateCylinderField = <K extends keyof DiveConfigurationCylinder>(
  index: number,
  field: K,
  value: DiveConfigurationCylinder[K],
) => {
  const cylinders = [...(props.modelValue.configuration?.cylinders ?? [])]
  const current = cylinders[index]
  if (!current) return
  cylinders[index] = { ...current, [field]: value }
  updateCylinders(cylinders)
}

const updateCylinderNumberField = (
  index: number,
  field: 'startBar' | 'endBar',
  event: Event,
) => {
  const value = (event.target as HTMLInputElement).value
  updateCylinderField(index, field, value === '' ? null : Number(value))
}

const updateCylinderSizeValue = (index: number, event: Event) => {
  const cylinders = [...(props.modelValue.configuration?.cylinders ?? [])]
  const current = cylinders[index]
  if (!current) return
  const value = Number((event.target as HTMLInputElement).value)
  updateCylinderField(index, 'size', { ...current.size, value })
}

const updateCylinderGasField = (index: number, field: 'o2' | 'he', event: Event) => {
  const cylinders = [...(props.modelValue.configuration?.cylinders ?? [])]
  const current = cylinders[index]
  if (!current) return
  // Inputs are entered as whole percent (e.g. 21) - stored as a 0-1 fraction.
  const percent = Number((event.target as HTMLInputElement).value)
  updateCylinderField(index, 'gas', { ...current.gas, [field]: percent / 100 })
}

const updateCylinderRole = (index: number, role: CylinderRole) => {
  const cylinders = [...(props.modelValue.configuration?.cylinders ?? [])]
  const current = cylinders[index]
  if (!current) return
  // A CC O2 cylinder (the CCR's own oxygen supply) is virtually always pure O2 - default the mix
  // to 100% when this role is picked, rather than leaving whatever was there before (often plain
  // air, since that's the default for a newly-added cylinder). Still freely editable afterward,
  // e.g. down to 99.5% for industrial-grade O2.
  const gas = role === 'O2' ? { o2: 1, he: 0 } : current.gas
  cylinders[index] = { ...current, role, gas }
  updateCylinders(cylinders)
}

const updateCylinderUsageElapsed = (
  index: number,
  field: 'usageStart' | 'usageEnd',
  part: 'minutes' | 'seconds',
  event: Event,
) => {
  const cylinders = props.modelValue.configuration?.cylinders ?? []
  const current = cylinders[index]
  if (!current) return
  const rawValue = (event.target as HTMLInputElement).value
  if (rawValue === '') {
    // Clearing either half clears the whole field - a lone minutes or seconds value with the
    // other part missing isn't a usable timestamp.
    updateCylinderField(index, field, null)
    return
  }
  const existing = elapsedMinutesSeconds(current[field], props.diveStart) ?? {
    minutes: 0,
    seconds: 0,
  }
  const next = { ...existing, [part]: Math.max(0, Number(rawValue)) }
  updateCylinderField(
    index,
    field,
    epochFromElapsedMinutesSeconds(next.minutes, next.seconds, props.diveStart),
  )
}

const formatElapsedRange = (window: UsageWindow): string => {
  const start = elapsedMinutesSeconds(window.start, props.diveStart)
  const end = elapsedMinutesSeconds(window.end, props.diveStart)
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (t: { minutes: number; seconds: number } | null) =>
    t ? `${pad(t.minutes)}:${pad(t.seconds)}` : '?'
  return `${fmt(start)}–${fmt(end)}`
}

// A manually-entered dive's synthetic surface/max-depth/surface profile is on a fixed "Manual
// Entry" computer (see DiveService#createEmptyDive) - same duck-typed signal DiveView.vue's own
// isManualDive already uses, no dedicated flag exists. Average Depth is only ever editable here
// for a manual dive - for a real profile it's always computed server-side and any value sent here
// would just be silently ignored.
const isManualDive = computed(
  () => props.profiles?.[0]?.diveComputer?.customIdentifier === 'Manual Entry',
)

// One suggestion list per cylinder index, computed from the primary profile's actual gas-switch
// history - see cylinderUsageWindows.ts. Only meaningful while Usage Start/End are unset (the
// template hides the panel once either is set), but computed for every cylinder regardless so a
// row's suggestions are ready the moment its gas% settles, without a per-row watcher.
const cylinderSuggestions = computed<UsageWindow[][]>(() => {
  const cylinders = props.modelValue.configuration?.cylinders ?? []
  const profile = primaryProfile(props.profiles)
  if (!profile) return cylinders.map(() => [])
  return cylinders.map((cylinder) => {
    const windows = findGasMatchWindows(profile.measurements, cylinder.gas)
    // Longest first, so index 0 (the visually "suggested" one and the one a click on it applies
    // to this row) is the most plausible real usage window, not just whichever came first.
    return [...windows].sort((a, b) => b.end - b.start - (a.end - a.start))
  })
})

const applySuggestedWindow = (index: number, window: UsageWindow, isDefault: boolean) => {
  if (isDefault) {
    // The current row has no usage set yet - fill it directly.
    const cylinders = [...(props.modelValue.configuration?.cylinders ?? [])]
    const current = cylinders[index]
    if (!current) return
    cylinders[index] = { ...current, usageStart: window.start, usageEnd: window.end }
    updateCylinders(cylinders)
    return
  }
  // A non-default match is a second, non-contiguous window for the same gas (e.g. a bailout
  // breathed twice) - one cylinder row only holds one window, so it becomes its own new row
  // (same size/role/gas as the row it was suggested for) rather than overwriting the current one.
  const cylinders = [...(props.modelValue.configuration?.cylinders ?? [])]
  const source = cylinders[index]
  if (!source) return
  cylinders.splice(index + 1, 0, {
    ...source,
    id: -Date.now(),
    usageStart: window.start,
    usageEnd: window.end,
  })
  updateCylinders(cylinders)
}

const updateConfigSuitField = (field: string, value: string | number | undefined) => {
  if (!props.modelValue.configuration || !props.modelValue.configuration.suit) {
    return
  }

  const updatedSuit = {
    ...props.modelValue.configuration.suit,
    [field]: value,
  }

  // Ensure notes is always a string, not null or undefined
  if (field !== 'notes' && (updatedSuit.notes === null || updatedSuit.notes === undefined)) {
    updatedSuit.notes = ''
  }

  emit('update:modelValue', {
    ...props.modelValue,
    configuration: {
      ...props.modelValue.configuration,
      suit: updatedSuit,
    },
  })
}

// Suit management helpers
const handleSuitSelected = (suit: Suit) => {
  applySuitToModel(suit)
  showSuitModal.value = false
}

const applySuitToModel = (suit: Suit) => {
  emit('update:modelValue', {
    ...props.modelValue,
    configuration: {
      ...props.modelValue.configuration!,
      suit,
      // Picking a specific saved suit clears any noted ad-hoc type - the two are mutually
      // exclusive in the UI.
      adHocSuitType: null,
    },
  })
}

const updateAdHocSuitType = (value: string) => {
  emit('update:modelValue', {
    ...props.modelValue,
    configuration: {
      ...props.modelValue.configuration!,
      adHocSuitType: (value || null) as SuitType | null,
    },
  })
}

// CCR unit management helpers
const handleCcrUnitSelected = (ccrUnit: CcrUnit) => {
  emit('update:modelValue', {
    ...props.modelValue,
    configuration: {
      ...props.modelValue.configuration!,
      ccrUnit,
    },
  })
  showCcrUnitModal.value = false
  inferBaseConfigurationFromCcrUnit(ccrUnit.id)
}

// A given CCR rig is almost always dived in the same rig configuration (e.g. a sidemount
// rebreather stays a sidemount rebreather) - rather than asking the diver to re-pick "Sidemount
// CCR" every single time, look at the most recent dive that already used this unit and carry its
// base configuration forward. Best-effort: a brand-new unit with no dive history, or a lookup
// failure, just leaves the current selection untouched.
const inferBaseConfigurationFromCcrUnit = async (ccrUnitId: number) => {
  // Don't clobber an already-CCR selection the diver may have made deliberately.
  if (
    props.modelValue.configuration?.base &&
    isCcrBaseConfiguration(props.modelValue.configuration.base)
  ) {
    return
  }
  try {
    const listRes = await getWithToken<PagedResult<{ id: number }>>(
      `/v1/dives/ccrUnit?ccrUnitId=${ccrUnitId}&page=0&sortCol=NUMBER&sortDirection=DESCENDING`,
    )
    const mostRecentId = listRes.data.result[0]?.id
    if (mostRecentId === undefined) return
    const diveRes = await getWithToken<Dive>(`/v1/dives/${mostRecentId}`)
    const inferredBase = diveRes.data.configuration?.base
    if (inferredBase && isCcrBaseConfiguration(inferredBase)) {
      updateConfigField('base', inferredBase)
    }
  } catch (err) {
    console.error('Failed to infer base configuration from CCR unit history', err)
  }
}
</script>
