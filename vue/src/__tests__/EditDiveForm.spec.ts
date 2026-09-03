import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EditDiveForm from '@/components/dive/edit/EditDiveForm.vue'
import type { DiveConfiguration, DiveConfigurationCylinder, DiveProfile } from '@/lib/types/dive'

const DIVE_START = 1_000_000

const cylinder = (over: Partial<DiveConfigurationCylinder> = {}): DiveConfigurationCylinder => ({
  id: 1,
  size: { unit: 'LITER', value: 12 },
  material: 'STEEL',
  startBar: 220,
  endBar: 80,
  notes: '',
  gas: { o2: 0.5, he: 0 },
  role: 'OC',
  usageWindows: [],
  ...over,
})

const configuration = (cylinders: DiveConfigurationCylinder[]): DiveConfiguration => ({
  suit: { id: 0, userId: 1, type: null, notes: '' },
  weight: 6,
  cylinders,
})

const baseModel = (cylinders: DiveConfigurationCylinder[]) => ({
  diveBuddies: [],
  gasConsumption: { sacBar: 0, rmvLiters: 0, totalLiters: 0 },
  configuration: configuration(cylinders),
})

const mountForm = (modelValue: Record<string, unknown>, extraProps: Record<string, unknown> = {}) =>
  mount(EditDiveForm, {
    props: { modelValue, userId: 1, diveStart: DIVE_START, ...extraProps },
    global: {
      stubs: {
        DiveSiteMapPicker: true,
        DiveSiteSearch: true,
        BuddyNameAutocomplete: true,
        SuitSelector: true,
        CcrUnitSelector: true,
        BackfillHint: true,
      },
    },
  })

/** Latest configuration.cylinders from the last update:modelValue emit. */
const latestCylinders = (wrapper: ReturnType<typeof mountForm>): DiveConfigurationCylinder[] => {
  const emits = wrapper.emitted('update:modelValue') as { configuration: DiveConfiguration }[][]
  return emits[emits.length - 1]![0]!.configuration.cylinders
}

describe('EditDiveForm - cylinder usage windows', () => {
  it('adds a usage window row, then removes it', async () => {
    const wrapper = mountForm(baseModel([cylinder()]))

    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Add usage window'))!
    await addBtn.trigger('click')
    let cylinders = latestCylinders(wrapper)
    expect(cylinders[0]!.usageWindows).toEqual([{ start: null, end: null }])

    // Re-mount-free: feed the emitted model back in so the row renders, then add a second.
    await wrapper.setProps({ modelValue: { ...baseModel(cylinders) } })
    await wrapper.findAll('button').find((b) => b.text().includes('Add usage window'))!.trigger('click')
    cylinders = latestCylinders(wrapper)
    expect(cylinders[0]!.usageWindows).toHaveLength(2)

    await wrapper.setProps({ modelValue: { ...baseModel(cylinders) } })
    const removeBtn = wrapper.findAll('button').find((b) => b.text().trim() === 'Remove')!
    await removeBtn.trigger('click')
    expect(latestCylinders(wrapper)[0]!.usageWindows).toHaveLength(1)
  })

  it('"fill from gas match" appends every matched window to the one cylinder, not new rows', async () => {
    const profile = {
      id: 1,
      diveComputer: { id: 1, customIdentifier: 'X', manufacturer: { id: 1, name: 'X' } },
      start: DIVE_START,
      end: DIVE_START + 10_000,
      summary: {},
      measurements: [
        { time: DIVE_START + 1000, gas: { o2: 0.21, he: 0, n2: 0.79 } },
        { time: DIVE_START + 2000, gas: { o2: 0.5, he: 0, n2: 0.5 } },
        { time: DIVE_START + 3000, gas: { o2: 0.21, he: 0, n2: 0.79 } },
        { time: DIVE_START + 4000, gas: { o2: 0.5, he: 0, n2: 0.5 } },
        { time: DIVE_START + 5000, gas: { o2: 0.5, he: 0, n2: 0.5 } },
      ].map((m, i) => ({ id: i, measurement: { ...m, temperature: { value: 20, unit: 'CELSIUS' }, depth: 20, ndl: '', deco: [] } })),
    } as unknown as DiveProfile

    const wrapper = mountForm(baseModel([cylinder()]), { profiles: [profile] })

    const applyBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Fill from gas match'))
    expect(applyBtn).toBeTruthy()
    await applyBtn!.trigger('click')

    const cylinders = latestCylinders(wrapper)
    expect(cylinders).toHaveLength(1)
    expect(cylinders[0]!.usageWindows).toEqual([
      { start: DIVE_START + 4000, end: DIVE_START + 5000 },
      { start: DIVE_START + 2000, end: DIVE_START + 2000 },
    ])
  })
})

describe('EditDiveForm - Part A / B / C', () => {
  it('renders the standard-cylinder picker and no free-form litre input for a catalog size', () => {
    const wrapper = mountForm(baseModel([cylinder({ size: { unit: 'LITER', value: 12 }, material: 'STEEL' })]))
    const select = wrapper.findAll('select').find((s) => s.findAll('option').some((o) => o.text().includes('12 L Steel')))!
    expect((select.element as HTMLSelectElement).value).toBe('steel-12')
    // Custom litre input only appears for a "custom" selection.
    expect(wrapper.findAll('label').some((l) => l.text().startsWith('Size ('))).toBe(false)
  })

  it('picking "20 L Steel" sets both size and material on the cylinder', async () => {
    const wrapper = mountForm(baseModel([cylinder({ size: { unit: 'LITER', value: 12 }, material: 'STEEL' })]))
    const select = wrapper.findAll('select').find((s) => s.findAll('option').some((o) => o.text().includes('12 L Steel')))!
    await select.setValue('steel-20')
    const c = latestCylinders(wrapper)[0]!
    expect(c.size).toEqual({ unit: 'LITER', value: 20 })
    expect(c.material).toBe('STEEL')
  })

  it('opens the custom litre + unit + material inputs for an off-catalog stored size', () => {
    const wrapper = mountForm(baseModel([cylinder({ size: { unit: 'LITER', value: 13 }, material: null })]))
    expect(wrapper.findAll('label').some((l) => l.text().startsWith('Size ('))).toBe(true)
    expect(wrapper.findAll('label').some((l) => l.text() === 'Material')).toBe(true)
  })

  it('has no SAC (bar/min) input, but keeps RMV and Total Gas', () => {
    const wrapper = mountForm(baseModel([cylinder()]))
    expect(wrapper.find('#sac-bar').exists()).toBe(false)
    expect(wrapper.find('#rmv-liters').exists()).toBe(true)
    expect(wrapper.find('#total-liters').exists()).toBe(true)
  })

  it('hides the CCR unit section on an OC dive behind a reveal link, then shows it on click', async () => {
    const wrapper = mountForm(baseModel([cylinder()]))
    expect(wrapper.text()).toContain('Rebreather dive? Add a CCR unit')
    expect(wrapper.text()).not.toContain('Choose / Create CCR Unit')

    await wrapper.findAll('button').find((b) => b.text().includes('Rebreather dive?'))!.trigger('click')
    expect(wrapper.text()).toContain('Choose / Create CCR Unit')
  })

  it('shows the CCR unit section outright when a profile has CC-loop samples', () => {
    const ccProfile = {
      id: 1,
      measurements: [{ id: 1, measurement: { mode: 'CC', time: DIVE_START, temperature: { value: 20, unit: 'CELSIUS' }, depth: 20, ndl: '', deco: [] } }],
    } as unknown as DiveProfile
    const wrapper = mountForm(baseModel([cylinder()]), { profiles: [ccProfile] })
    expect(wrapper.text()).toContain('Choose / Create CCR Unit')
    expect(wrapper.text()).not.toContain('Rebreather dive? Add a CCR unit')
  })

  it('shows an amber warning when entered RMV disagrees >15% with the calculated baseline', () => {
    const wrapper = mountForm(
      { ...baseModel([cylinder()]), gasConsumption: { sacBar: 0, rmvLiters: 12, totalLiters: 0 } },
      { calculatedRmvBaseline: 18 },
    )
    expect(wrapper.text()).toContain('tracked cylinders')
  })
})

describe('EditDiveForm - dive leader', () => {
  const leaderSelect = (wrapper: ReturnType<typeof mountForm>) =>
    wrapper.get('#dive-leader')

  it('offers a buddy added this session (not yet saved) as a leader option by name', async () => {
    const wrapper = mountForm({ ...baseModel([]), diveBuddies: [{ name: 'Alex', role: null }] })
    const options = leaderSelect(wrapper)
      .findAll('option')
      .map((o) => o.attributes('value'))
    expect(options).toContain('newnamed:Alex')

    await leaderSelect(wrapper).setValue('newnamed:Alex')
    const emits = wrapper.emitted('update:modelValue') as Record<string, unknown>[][]
    expect(emits[emits.length - 1]![0]).toMatchObject({
      leaderNamedBuddyName: 'Alex',
      leaderNamedBuddyId: null,
      leaderSelfExplicit: false,
    })
  })

  it('a persisted buddy is offered by id, not duplicated as a newnamed option', () => {
    const wrapper = mountForm(
      { ...baseModel([]), diveBuddies: [{ name: 'Sam', role: null }] },
      { existingNamedBuddies: [{ id: 9, name: 'Sam', role: null }] },
    )
    const options = leaderSelect(wrapper)
      .findAll('option')
      .map((o) => o.attributes('value'))
    expect(options).toContain('named:9')
    expect(options).not.toContain('newnamed:Sam')
  })

  it('clears a pending-name leader when that buddy is removed', async () => {
    const wrapper = mountForm({
      ...baseModel([]),
      diveBuddies: [{ name: 'Alex', role: null }],
      leaderNamedBuddyName: 'Alex',
    })
    const removeBtn = wrapper.findAll('button').find((b) => b.text() === '×')!
    await removeBtn.trigger('click')
    const emits = wrapper.emitted('update:modelValue') as Record<string, unknown>[][]
    expect(emits[emits.length - 1]![0]).toMatchObject({ leaderNamedBuddyName: null })
  })
})

describe('EditDiveForm - date & time', () => {
  const profile = { id: 1, diveComputer: { customIdentifier: 'Perdix 2' } } as unknown as DiveProfile

  it('shows the date field for a manual dive with the "when did this dive start" label', () => {
    const wrapper = mountForm(baseModel([]), { manualEntry: true, profiles: [profile] })
    const input = wrapper.get('#manual-start')
    expect(input.attributes('type')).toBe('datetime-local')
    expect(wrapper.text()).toContain('When did this dive start?')
    expect(wrapper.text()).not.toContain("dive computer's clock was wrong")
  })

  it('also shows the date field for an imported dive, framed as a wrong-clock correction', () => {
    const wrapper = mountForm(baseModel([]), { manualEntry: false, profiles: [profile] })
    expect(wrapper.find('#manual-start').exists()).toBe(true)
    expect(wrapper.text()).toContain('Recorded start')
    expect(wrapper.text()).toContain("dive computer's clock was wrong")
  })

  it('emits the picked start time as epoch millis on modelValue', async () => {
    const wrapper = mountForm(baseModel([]), { manualEntry: false, profiles: [profile] })
    await wrapper.get('#manual-start').setValue('2026-03-10T08:15')
    const emits = wrapper.emitted('update:modelValue') as Record<string, unknown>[][]
    const startTime = emits[emits.length - 1]![0]!.startTime as number
    expect(startTime).toBe(new Date(2026, 2, 10, 8, 15).getTime())
  })
})
