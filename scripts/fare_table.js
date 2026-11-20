// Builds the KMB-only Fare table from hk-bus-crawling's routeFareList JSON.
// Key: "route|bound|service_type"; value: the Fares by boarding position (index seq-1).

const EXPECTED_KEYS = ['holidays', 'routeList', 'serviceDayMap', 'stopList', 'stopMap']
const MAX_ROUTE_DROP = 0.1

function buildFareTable(raw, previous = null) {
  for (const key of EXPECTED_KEYS) {
    if (!(key in raw)) throw new Error(`input is missing the "${key}" key`)
  }
  const table = {}
  for (const entry of Object.values(raw.routeList)) {
    if (!entry.stops.kmb || !entry.fares || entry.fares.length === 0) continue
    const key = `${entry.route}|${entry.bound.kmb}|${entry.serviceType}`
    if (entry.fares.length !== entry.stops.kmb.length - 1) {
      throw new Error(`${key}: ${entry.fares.length} fares for ${entry.stops.kmb.length} stops`)
    }
    table[key] = entry.fares.map(Number)
  }
  if (previous) {
    const before = Object.keys(previous).length
    const after = Object.keys(table).length
    if (after < before * (1 - MAX_ROUTE_DROP)) {
      throw new Error(`KMB Route count dropped from ${before} to ${after}`)
    }
  }
  return table
}

module.exports = { buildFareTable }
