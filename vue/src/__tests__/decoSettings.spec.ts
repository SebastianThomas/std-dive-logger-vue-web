import { describe, it, expect } from 'vitest'
import { formatDecoSettings, decoSettingsDetails } from '@/lib/dive/decoSettings'

describe('formatDecoSettings', () => {
  it('summarises algorithm, gradient factors and conservatism', () => {
    expect(
      formatDecoSettings({ algorithm: 'Bühlmann ZHL-16C', gfLow: 50, gfHigh: 85, details: {} }),
    ).toBe('Bühlmann ZHL-16C · GF 50/85')
    expect(formatDecoSettings({ algorithm: 'VPM-B', conservatism: '+3', details: {} })).toBe(
      'VPM-B · Conservatism +3',
    )
  })

  it('has nothing to say without any of them', () => {
    expect(formatDecoSettings({ firmware: '66', details: {} })).toBeNull()
    expect(formatDecoSettings(null)).toBeNull()
  })
})

describe('decoSettingsDetails', () => {
  it('lists what the device reported beyond the summary', () => {
    expect(
      decoSettingsDetails({
        implementation: 'Suunto',
        firmware: '4.0.1131',
        surfacePressureMbar: 985,
        startCns: 0,
        endCns: 13.2,
        endOtu: 38.3,
        details: {},
      }),
    ).toEqual([
      'Implementation: Suunto',
      'Firmware: 4.0.1131',
      'Surface pressure: 985 mbar',
      'Device CNS: 0 → 13 %',
      'Device OTU: 38',
    ])
  })
})
