import { computed, type Ref } from 'vue'
import type { Dive, TeamTerminology } from '@/lib/types/dive'

/**
 * Resolves whether a dive's buddy-related UI text should say "Buddy"/"Buddies" or
 * "Team"/"Team Members". Resolution order: the dive's own `teamTerminology` override -> the first
 * of the dive's trips that has its own override set (pass via `tripTerminology`, e.g. the first
 * non-null value found among a dive's `GET /v1/dive-trips/for-dive/{id}` results) -> hardcoded
 * "Buddy" fallback. Only affects labels the user actually sees - internal variable/type names stay
 * "buddy" everywhere.
 */
export function useTeamTerminology(
  dive: Ref<Dive | null | undefined>,
  tripTerminology?: Ref<TeamTerminology | null | undefined>,
) {
  const terminology = computed<TeamTerminology>(
    () => dive.value?.teamTerminology ?? tripTerminology?.value ?? 'BUDDY',
  )

  const singular = computed(() => (terminology.value === 'TEAM' ? 'Team Member' : 'Buddy'))
  const plural = computed(() => (terminology.value === 'TEAM' ? 'Team' : 'Buddies'))

  return { terminology, singular, plural }
}
