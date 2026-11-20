import { createFareLookup } from './fares'

const route = { route: '1', bound: 'O', service_type: '1' }

describe('fareFor', () => {
  const fareFor = createFareLookup({ '1|O|1': [6.7, 6.7, 5.8] })

  it('gives the Fare for boarding at a position on the Route, counting seq from 1', () => {
    expect(fareFor(route, '1')).toBe(6.7)
    expect(fareFor(route, '3')).toBe(5.8)
  })

  it('gives no Fare at the terminus, past the last position', () => {
    expect(fareFor(route, '4')).toBeNull()
  })

  it('gives no Fare for a Route the table does not know, or a different direction', () => {
    expect(fareFor({ ...route, route: '999' }, '1')).toBeNull()
    expect(fareFor({ ...route, bound: 'I' }, '1')).toBeNull()
  })

  it('gives a circular Route its own Fare at each of a Stop\'s two positions', () => {
    const circular = createFareLookup({ 'C1|O|1': [8, 8, 3, 3] })
    const ref = { route: 'C1', bound: 'O', service_type: '1' }
    // Five positions; Stop X is at seq 1 and seq 3.
    expect(circular(ref, '1')).toBe(8)
    expect(circular(ref, '3')).toBe(3)
  })
})
