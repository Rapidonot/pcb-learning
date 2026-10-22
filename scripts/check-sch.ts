import { blinkySchematic, checkAgainst, schNets } from '../src/pcb/schematic'
import { netlist } from '../src/pcb/project'
const doc = blinkySchematic()
console.log(checkAgainst(doc, netlist))
const n = schNets(doc)
console.log('junctions', n.junctions)
console.log('groups', n.groups.map(g => g.join(' ')))
const bare = { ...doc, wires: [] }
console.log('unwired', checkAgainst(bare, netlist))
