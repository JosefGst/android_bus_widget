import type { StopGroup } from './favorite_board'
import { STRINGS } from './strings'
import { widgetSections } from './widget_sections'

const NOW = '2026-11-13T06:41:00Z'
const inMinutes = (minutes: number): string => new Date(Date.parse(NOW) + minutes * 60_000).toISOString()

const route = (code: string, stop: string, etas: string[]) => ({
  route: code,
  stop,
  bound: 'O',
  service_type: '1',
  dest: 'TUEN MUN FERRY PIER',
  fare: null,
  etas: etas.map(eta => ({ eta })),
})

const groups: StopGroup[] = [
  { stopName: 'Fo Yin Road', stopIds: ['S1'], routes: [route('272X', 'S1', [inMinutes(3), inMinutes(15)]), route('272P', 'S1', [])] },
  { stopName: 'Siu Hong Station', stopIds: ['S2'], routes: [route('967', 'S2', [inMinutes(0.2)])] },
]

describe('widgetSections', () => {
  it('shows the Stop name exactly as the board gives it (the board already made it a display name)', () => {
    const [section] = widgetSections([{ ...groups[0], stopName: 'Name As Given (PA1)' }], NOW, STRINGS.en, 'en')

    expect(section.stopName).toBe('Name As Given (PA1)')
  })

  it('gives one section per Stop, with each Route and its next bus, in board order', () => {
    expect(widgetSections(groups, NOW, STRINGS.en, 'en')).toEqual([
      {
        key: 'Fo Yin Road',
        stopName: 'Fo Yin Road',
        rows: [
          { key: 'S1|272X|O', route: '272X', dest: 'Tuen Mun Ferry Pier', time: '3', unit: 'min', isNow: false },
          { key: 'S1|272P|O', route: '272P', dest: 'Tuen Mun Ferry Pier', time: '--', unit: '', isNow: false },
        ],
      },
      { key: 'Siu Hong Station', stopName: 'Siu Hong Station', rows: [{ key: 'S2|967|O', route: '967', dest: 'Tuen Mun Ferry Pier', time: 'Now', unit: '', isNow: true }] },
    ])
  })

  it('counts the minutes from now, not from when the board was loaded', () => {
    expect(widgetSections(groups, inMinutes(2), STRINGS.en, 'en')[0].rows[0]).toMatchObject({ time: '1', unit: 'min' })
  })

  it('writes the time in the chosen language and leaves Chinese Stop names as they are', () => {
    const chinese: StopGroup[] = [{ ...groups[1], stopName: '兆康站' }]
    expect(widgetSections(chinese, NOW, STRINGS.tc, 'tc')).toEqual([
      { key: '兆康站', stopName: '兆康站', rows: [{ key: 'S2|967|O', route: '967', dest: 'TUEN MUN FERRY PIER', time: '到站', unit: '', isNow: true }] },
    ])
    expect(widgetSections([groups[0]], NOW, STRINGS.tc, 'tc')[0].rows[0]).toMatchObject({ time: '3', unit: '分鐘' })
  })

  it('leaves out Stops with no Routes to show', () => {
    expect(widgetSections([{ stopName: 'EMPTY', stopIds: ['S9'], routes: [] }], NOW, STRINGS.en, 'en')).toEqual([])
  })
})
