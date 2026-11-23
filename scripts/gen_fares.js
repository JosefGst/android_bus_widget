// Writes utils/generated/fares.json: the KMB Fare table from hk-bus-crawling's daily JSON.
// Run before a release, or let the monthly CI job do it:
//   npm run gen:fares
// Fails (and writes nothing) if the data looks broken; see scripts/fare_table.js.
const fs = require('fs')
const path = require('path')
const { buildFareTable } = require('./fare_table')

const SOURCE_URL = 'http://data.hkbus.app/routeFareList.min.json'
const outFile = path.resolve(__dirname, '..', 'utils', 'generated', 'fares.json')

async function main() {
  const response = await fetch(SOURCE_URL)
  if (!response.ok) throw new Error(`${SOURCE_URL} answered ${response.status}`)
  const raw = await response.json()
  const previous = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : null
  const table = buildFareTable(raw, previous)
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, JSON.stringify(table, Object.keys(table).sort()) + '\n')
  console.log(`Wrote ${Object.keys(table).length} KMB Routes to ${path.relative(process.cwd(), outFile)}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
