// Senior-friendly look shared by the screens: large text, large targets, high contrast.
// See docs/ideas/senior-friendly-redesign/plan.md for the rules behind these values.

export const COLORS = {
  background: '#F2F1EC',
  surface: '#FFFFFF',
  ink: '#14171F',
  inkMuted: '#3D4452',
  line: '#D6D3CB',
  lineSoft: '#E6E3DC',
  outline: '#8A8578',
  chevron: '#6B7280',
  accent: '#0A4FBF',
  accentSoft: '#E3ECFB',
  onAccent: '#FFFFFF',
  nowBackground: '#FFE2A8',
  nowInk: '#5C3B00',
  danger: '#B42318',
} as const

export const FONT_SIZES = {
  label: 16,
  body: 19,
  stopName: 21,
  badge: 26,
  title: 34,
  minutes: 44,
} as const

export const TOUCH_TARGET = 52
export const SCREEN_GUTTER = 16
export const CARD_RADIUS = 20
