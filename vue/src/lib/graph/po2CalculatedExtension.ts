import type { DiveProfile } from '@/lib/types/dive'
import { detectModeTransitions } from './modeTransitions'

/**
 * PO2 calculated is a held/discrete value (drawn with a step-after curve): a CCR computer only
 * logs a new sample when the setpoint loop changes it, so the real value stays flat at the last
 * logged sample until the dive ends or the diver bails to OC (where the loop's calculated PO2 no
 * longer applies). Without this, the step-line visually stops wherever the last logged sample
 * happened to be - which reads as "PO2 calculated became unknown" rather than "it kept holding" -
 * especially misleading when only a handful of samples were logged for the whole dive.
 */
export function extendPo2CalculatedToBoundary(
  points: [number, number][],
  profile: DiveProfile,
): [number, number][] {
  if (points.length === 0) return points
  const last = points[points.length - 1]!
  const [lastTime, lastValue] = last

  const bailout = detectModeTransitions(profile).find(
    (t) => t.mode === 'OC' && t.time > lastTime,
  )
  const boundary = bailout ? bailout.time : profile.end

  if (boundary <= lastTime) return points
  return [...points, [boundary, lastValue]]
}
