import { analyze, drc } from '../src/pcb/board'
import { stages } from '../src/pcb/project'

for (const [name, mk] of Object.entries(stages)) {
  const doc = mk()
  const conn = analyze(doc)
  const errs = drc(doc)
  const byKind: Record<string, number> = {}
  for (const e of errs) byKind[e.kind] = (byKind[e.kind] ?? 0) + 1
  console.log(`\n== ${name}: ratsnest ${conn.ratsnest.length}, shorts ${conn.shorts.length}, complete ${[...conn.complete].join(',')}`)
  console.log('   drc', JSON.stringify(byKind))
  if (name === 'routed' || name === 'finished') for (const e of errs) console.log('   -', e.kind, e.message)
}
