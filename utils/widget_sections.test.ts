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
  dest: 'X',
  etas: etas.map(eta => ({ eta })),
})

const groups: StopGroup[] = [
  { stopName: 'FO YIN ROAD', stopIds: ['S1'], routes: [route('272X', 'S1', [inMinutes(3), inMinutes(15)]), route('272P', 'S1', [])] },
  { stopName: 'SIU HONG STATION', stopIds: ['S2'], routes: [route('967', 'S2', [inMinutes(0.2)])] },
]

describe('widgetSections', () => {
  it('gives one section per Stop, with each Route and its next bus, in board order', () => {
    expect(widgetSections(groups, NOW, 'en', STRINGS.en)).toEqual([
      {
        key: 'FO YIN ROAD',
        stopName: 'Fo Yin Road',
        rows: [
          { key: 'S1|272X|O', route: '272X', time: '3 min', isNow: false },
          { key: 'S1|272P|O', route: '272P', time: '--', isNow: false },
        ],
      },
      { key: 'SIU HONG STATION', stopName: 'Siu Hong Station', rows: [{ key: 'S2|967|O', route: '967', time: 'Now', isNow: true }] },
    ])
  })

  it('counts the minutes from now, not from when the board was loaded', () => {
    expect(widgetSections(groups, inMinutes(2), 'en', STRINGS.en)[0].rows[0].time).toBe('1 min')
  })

  it('writes the time in the chosen language and leaves Chinese Stop names as they are', () => {
    const chinese: StopGroup[] = [{ ...groups[1], stopName: '兆康站' }]
    expect(widgetSections(chinese, NOW, 'tc', STRINGS.tc)).toEqual([
      { key: '兆康站', stopName: '兆康站', rows: [{ key: 'S2|967|O', route: '967', time: '到站', isNow: true }] },
    ])
    expect(widgetSections([groups[0]], NOW, 'tc', STRINGS.tc)[0].rows[0].time).toBe('3 分')
  })

  it('leaves out Stops with no Routes to show', () => {
    expect(widgetSections([{ stopName: 'EMPTY', stopIds: ['S9'], routes: [] }], NOW, 'en', STRINGS.en)).toEqual([])
  })
})
