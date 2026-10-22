export type StackLayerId = 'silkTop' | 'maskTop' | 'copperTop' | 'core' | 'copperBottom' | 'maskBottom'

export interface StackLayer {
  id: StackLayerId
  name: string
  short: string
  color: string
  about: string
  thickness: string
}

export const STACK: StackLayer[] = [
  {
    id: 'silkTop',
    name: 'Silkscreen',
    short: 'SILK',
    color: '#f4f1e8',
    thickness: '~0.01 mm ink',
    about: 'White ink printed on top. It shows part labels (R1, U1…), outlines and logos. It is just for humans and carries no electricity.',
  },
  {
    id: 'maskTop',
    name: 'Solder mask',
    short: 'MASK',
    color: '#1f6b47',
    thickness: '~0.02 mm',
    about: 'A thin coat of protective lacquer that covers the copper and gives boards their green colour. It has openings only where parts get soldered (the pads).',
  },
  {
    id: 'copperTop',
    name: 'Top copper',
    short: 'COPPER',
    color: '#d58a44',
    thickness: '0.035 mm (1 oz)',
    about: 'A sheet of copper etched into traces (the "wires") and pads (where parts are soldered). This is where electricity actually flows.',
  },
  {
    id: 'core',
    name: 'FR-4 core',
    short: 'FR-4',
    color: '#cbb781',
    thickness: '1.6 mm (standard)',
    about: 'The stiff base: woven fibreglass soaked in epoxy, called FR-4. It holds everything up and keeps the two copper layers apart. It does not conduct electricity.',
  },
  {
    id: 'copperBottom',
    name: 'Bottom copper',
    short: 'COPPER',
    color: '#c27832',
    thickness: '0.035 mm (1 oz)',
    about: 'A second copper layer on the underside. On a 2-layer board, traces can dive through a "via" and continue down here.',
  },
  {
    id: 'maskBottom',
    name: 'Bottom mask',
    short: 'MASK',
    color: '#185a3b',
    thickness: '~0.02 mm',
    about: 'Solder mask on the bottom, protecting the bottom copper the same way.',
  },
]

