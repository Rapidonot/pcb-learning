import { useEffect, useRef, useState } from 'react'
import type { LessonContent } from '../types'
import { Callout, Readout, Slider } from '@/components/ui'
import { Compare, Figure, Formula, Menu, Steps } from '@/components/content'
import { Scene } from './Scene'
import './lesson07.css'

/* ------------------------------------------------------------------ */
/* 555 astable explainer                                               */
/* ------------------------------------------------------------------ */

const R_VALUES = [100, 220, 330, 470, 680, 1e3, 2.2e3, 4.7e3, 10e3, 22e3, 47e3, 100e3, 220e3, 470e3, 1e6]
const C_VALUES = [0.1e-6, 0.22e-6, 0.47e-6, 1e-6, 2.2e-6, 4.7e-6, 10e-6, 22e-6, 47e-6, 100e-6]

const fmtR = (r: number) => (r >= 1e6 ? `${r / 1e6}MΩ` : r >= 1e3 ? `${+(r / 1e3).toPrecision(3)}kΩ` : `${r}Ω`)
const fmtC = (c: number) => (c >= 1e-6 ? `${+(c * 1e6).toPrecision(3)}µF` : `${+(c * 1e9).toPrecision(3)}nF`)
const fmtT = (t: number) => (t >= 1 ? `${t.toFixed(2)} s` : t >= 1e-3 ? `${(t * 1e3).toPrecision(3)} ms` : `${(t * 1e6).toPrecision(3)} µs`)
const fmtF = (f: number) => (f >= 1e3 ? `${(f / 1e3).toPrecision(3)} kHz` : `${f.toPrecision(3)} Hz`)

function Astable() {
  const [ri1, setRi1] = useState(5) // 1k
  const [ri2, setRi2] = useState(10) // 47k
  const [ci, setCi] = useState(6) // 10µF
  const R1 = R_VALUES[ri1]
  const R2 = R_VALUES[ri2]
  const C = C_VALUES[ci]
  const tH = 0.693 * (R1 + R2) * C
  const tL = 0.693 * R2 * C
  const T = tH + tL
  const f = 1.44 / ((R1 + 2 * R2) * C)
  const duty = (R1 + R2) / (R1 + 2 * R2)
  const tooFast = f > 25

  // phase (0..1 of a period) driven by real time
  const [phase, setPhase] = useState(0)
  const startRef = useRef(performance.now())
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const tick = (now: number) => {
      const t = (now - startRef.current) / 1000
      setPhase(tooFast ? 0 : (t % T) / T)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [T, tooFast])
  const on = tooFast ? true : phase < duty

  // scope traces over 2.5 periods
  const W = 300
  const H = 150
  const periods = 2.5
  const px = (u: number) => (u / periods) * W
  const vy = (v: number) => 18 + (1 - v) * 56 // capacitor trace (0..1 of VCC)
  const oy = (hi: boolean) => (hi ? 96 : 132)
  const cap: string[] = []
  const out: string[] = []
  for (let i = 0; i <= 400; i++) {
    const u = (i / 400) * periods
    const ph = u % 1
    let v: number
    if (ph < duty) v = 1 - (2 / 3) * Math.pow(2, -ph / duty)
    else v = (2 / 3) * Math.pow(2, -(ph - duty) / (1 - duty))
    cap.push(`${px(u).toFixed(1)},${vy(v).toFixed(1)}`)
  }
  for (let k = 0; k < Math.ceil(periods); k++) {
    out.push(`${px(k)},${oy(true)} ${px(k + duty)},${oy(true)} ${px(k + duty)},${oy(false)} ${px(Math.min(periods, k + 1))},${oy(false)}`)
  }

  return (
    <div className="l07-astable">
      <div className="l07-astable__controls">
        <Slider label="R1 · timing resistor A" value={ri1} min={0} max={R_VALUES.length - 1} onChange={setRi1} format={(i) => fmtR(R_VALUES[i])} />
        <Slider label="R2 · timing resistor B" value={ri2} min={0} max={R_VALUES.length - 1} onChange={setRi2} format={(i) => fmtR(R_VALUES[i])} />
        <Slider label="C1 · timing capacitor" value={ci} min={0} max={C_VALUES.length - 1} onChange={setCi} format={(i) => fmtC(C_VALUES[i])} />
        <div className="l07-astable__note">
          Blinky uses 1kΩ, 47kΩ and 10µF. Bigger resistors or a bigger capacitor mean a slower blink. Above roughly 25 Hz your eye
          can no longer see the flicker and the LED just looks dimmer.
        </div>
      </div>
      <div className="l07-astable__out">
        <div className="l07-astable__top">
          <div className="l07-bigled" aria-label={on ? 'LED on' : 'LED off'}>
            <svg viewBox="-40 -40 80 80" width="74" height="74">
              <defs>
                <radialGradient id="l07-led-halo">
                  <stop offset="0" stopColor="#ff5a3c" stopOpacity="0.8" />
                  <stop offset="1" stopColor="#ff5a3c" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle r="38" fill="url(#l07-led-halo)" opacity={on ? (tooFast ? 0.45 + duty * 0.4 : 1) : 0} style={{ transition: 'opacity 0.05s' }} />
              <path d="M -14 14 L -14 -6 A 14 14 0 0 1 14 -6 L 14 14 Z" fill={on ? '#ff4b32' : '#7a2a20'} style={{ transition: 'fill 0.05s' }} />
              <rect x="-17" y="12" width="34" height="5" rx="1.5" fill={on ? '#ff6b52' : '#6b241c'} />
              <ellipse cx="-6" cy="-4" rx="4" ry="6" fill="#fff" opacity="0.35" />
              <line x1="-6" y1="17" x2="-6" y2="36" stroke="#b9bdc2" strokeWidth="2.4" />
              <line x1="6" y1="17" x2="6" y2="32" stroke="#b9bdc2" strokeWidth="2.4" />
            </svg>
          </div>
          <div className="l07-astable__readouts">
            <Readout label="Frequency" value={fmtF(f)} tone={Math.abs(f - 1.52) < 0.05 ? 'good' : undefined} />
            <Readout label="Duty cycle" value={`${Math.round(duty * 100)}`} unit="%" />
            <Readout label="On for" value={fmtT(tH)} />
            <Readout label="Off for" value={fmtT(tL)} />
          </div>
        </div>
        <div className="l07-scope">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Capacitor voltage and output waveform">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <line key={i} x1={(i * W) / 5} y1={0} x2={(i * W) / 5} y2={H} stroke="rgba(255,255,255,0.06)" />
            ))}
            <line x1={0} y1={vy(2 / 3)} x2={W} y2={vy(2 / 3)} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 3" />
            <line x1={0} y1={vy(1 / 3)} x2={W} y2={vy(1 / 3)} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 3" />
            <text x={W - 4} y={vy(2 / 3) - 3} fontSize="7" fill="rgba(255,255,255,0.5)" textAnchor="end" fontFamily="IBM Plex Mono, monospace">
              ⅔ VCC
            </text>
            <text x={W - 4} y={vy(1 / 3) + 9} fontSize="7" fill="rgba(255,255,255,0.5)" textAnchor="end" fontFamily="IBM Plex Mono, monospace">
              ⅓ VCC
            </text>
            <polyline points={cap.join(' ')} fill="none" stroke="#5fd08a" strokeWidth="1.8" />
            {out.map((d, i) => (
              <polyline key={i} points={d} fill="none" stroke="#ffb020" strokeWidth="1.8" strokeLinejoin="round" />
            ))}
            {!tooFast && <line x1={px(phase)} y1={0} x2={px(phase)} y2={H} stroke="#fff" strokeOpacity="0.5" />}
            <text x={6} y={12} fontSize="7.5" fill="#5fd08a" fontFamily="IBM Plex Mono, monospace">
              C1 VOLTAGE (THR)
            </text>
            <text x={6} y={90} fontSize="7.5" fill="#ffb020" fontFamily="IBM Plex Mono, monospace">
              OUT (PIN 3)
            </text>
            <text x={6} y={H - 4} fontSize="7" fill="rgba(255,255,255,0.45)" fontFamily="IBM Plex Mono, monospace">
              {fmtT(T / 2)} / div
            </text>
          </svg>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function TidyDemo({ tidy }: { tidy: boolean }) {
  // a tiny LED + resistor + supply drawn two ways
  const g = '#1f7a3f'
  const s = '#8a1c1c'
  return (
    <svg viewBox="0 0 220 110" width="100%" style={{ background: 'var(--sch-bg)', borderRadius: 8 }}>
      {tidy ? (
        <g>
          <g stroke={s} strokeWidth="1.6" fill="none">
            <line x1="30" y1="22" x2="30" y2="16" />
            <line x1="22" y1="16" x2="38" y2="16" />
            <rect x="74" y="33" width="24" height="10" />
            <path d="M 132 31 L 145 38 L 132 45 Z" />
            <line x1="145" y1="31" x2="145" y2="45" />
            <line x1="185" y1="70" x2="185" y2="76" />
            <line x1="177" y1="76" x2="193" y2="76" />
            <line x1="180" y1="79.5" x2="190" y2="79.5" />
          </g>
          <polyline points="30,22 30,38 74,38" fill="none" stroke={g} strokeWidth="1.6" />
          <polyline points="98,38 132,38" fill="none" stroke={g} strokeWidth="1.6" />
          <polyline points="145,38 185,38 185,70" fill="none" stroke={g} strokeWidth="1.6" />
          <text x="30" y="11" fontSize="8" textAnchor="middle" fill={s} fontFamily="IBM Plex Mono, monospace" fontWeight="600">
            VCC
          </text>
          <text x="86" y="28" fontSize="8" textAnchor="middle" fill="#1b4fbf" fontFamily="IBM Plex Mono, monospace">
            R3
          </text>
          <text x="138" y="26" fontSize="8" textAnchor="middle" fill="#1b4fbf" fontFamily="IBM Plex Mono, monospace">
            D1
          </text>
          <text x="110" y="100" fontSize="7.5" textAnchor="middle" fill="#666" fontFamily="IBM Plex Mono, monospace">
            POWER UP · FLOW LEFT TO RIGHT · GROUND DOWN
          </text>
        </g>
      ) : (
        <g>
          <g stroke={s} strokeWidth="1.6" fill="none">
            <line x1="190" y1="86" x2="190" y2="92" />
            <line x1="182" y1="92" x2="198" y2="92" />
            <rect x="40" y="62" width="10" height="24" />
            <path d="M 150 20 L 137 27 L 150 34 Z" />
            <line x1="137" y1="20" x2="137" y2="34" />
            <line x1="30" y1="22" x2="30" y2="28" />
            <line x1="22" y1="28" x2="38" y2="28" />
            <line x1="25" y1="31.5" x2="35" y2="31.5" />
          </g>
          <polyline points="190,86 190,50 45,50 45,62" fill="none" stroke={g} strokeWidth="1.6" />
          <polyline points="45,86 45,98 110,98 110,27 137,27" fill="none" stroke={g} strokeWidth="1.6" />
          <polyline points="150,27 170,27 170,8 30,8 30,22" fill="none" stroke={g} strokeWidth="1.6" />
          <text x="196" y="80" fontSize="7" fill={s} fontFamily="IBM Plex Mono, monospace">
            VCC?
          </text>
        </g>
      )}
    </svg>
  )
}

function Article() {
  return (
    <>
      <p className="lead">
        Drawing a schematic is mostly two jobs: put the right parts on the page, then join their pins with wires. The editor
        above starts you halfway, with Blinky's parts already placed. In EasyEDA you'll place them yourself first, but the wiring
        works the same way.
      </p>

      <h2>The EasyEDA schematic workflow</h2>
      <Steps
        items={[
          { title: 'Place the devices', body: <>Open <Menu path={['Place', 'Device']} /> and click each part onto the sheet. You picked Blinky's parts in <em>Choosing parts &amp; reading datasheets</em>, so this is mostly search, click, rotate.</> },
          { title: 'Wire the pins', body: 'Start the wire tool, click a pin end, click to add corners, and click another pin to finish.' },
          { title: 'Add labels and flags', body: 'Name nets with net labels and add VCC and GND flags, so you are not running long wires all over the page.' },
          { title: 'Annotate', body: <>Give every part a unique designator (R1, R2…) with <Menu path={['Design', 'Annotate Designator']} />.</> },
          { title: 'Check', body: <>Run <Menu path={['Design', 'Check DRC']} />. Results appear in the panel at the bottom of the editor. Fix everything before moving on to the board.</> },
        ]}
      />

      <h2>Wiring rules that keep you out of trouble</h2>
      <ul>
        <li>
          <strong>Connect at the very end of a pin.</strong> A wire that stops a grid square short looks connected but isn't. The
          editor above shows open pin ends as little hollow circles, and they disappear when a wire lands.
        </li>
        <li>
          <strong>Let the editor make junctions.</strong> When a wire ends on another wire, a dot appears automatically. No dot, no
          connection.
        </li>
        <li>
          <strong>Never run a wire straight through a pin.</strong> It joins that pin to the net, often by accident. In the editor
          above that shows up as a red short in the netlist check.
        </li>
        <li>
          <strong>Avoid four-way junctions.</strong> Offset them into two T-junctions so nobody mistakes a join for a crossing.
        </li>
      </ul>

      <h2>A tidy schematic is a readable one</h2>
      <p>
        Your schematic is documentation. In six months you, or someone helping you debug, will need to read it quickly. A few
        conventions make that easy: <strong>signals flow left to right</strong>, the <strong>supply sits at the top</strong> and{' '}
        <strong>ground at the bottom</strong>, and nets that would need a long wire get a label or flag instead.
      </p>
      <Compare
        leftLabel="Tidy"
        rightLabel="Spaghetti"
        left={<TidyDemo tidy />}
        right={<TidyDemo tidy={false} />}
      />

      <h2>Values, footprints and part numbers</h2>
      <p>
        A symbol is only half of a part. Before a board can be made, each one also needs the right <strong>footprint</strong> (the
        copper pads it will be soldered to) and, if you want the factory to assemble it, a <strong>supplier part number</strong>.
      </p>
      <Callout kind="easyeda" title="The Property panel is where parts get their details">
        Select a part and the <b>Property</b> panel on the right shows its name, designator, footprint, supplier, supplier part
        number and manufacturer part number. Tick name or value to show it on the canvas. LCSC part numbers start with a C, such as
        C21190, and the BOM and factory assembly use them to match the exact part. To swap a footprint, click the
        footprint field or use the Footprint Manager in the Tools menu.
      </Callout>

      <h2>How Blinky blinks: the 555 astable</h2>
      <p>
        The NE555 is a timer chip from the 1970s that is still made by the millions. Wired as Blinky is, it's an{' '}
        <strong>astable</strong>: it never settles, flipping its output high and low forever.
      </p>
      <p>
        Here's the loop. C1 <strong>charges</strong> through R1 and R2 while the output is high. When its voltage reaches two thirds
        of the supply, the 555 notices on its THR pin, flips the output low and opens its DIS pin, which{' '}
        <strong>drains</strong> C1 through R2 alone. When C1 falls to one third of the supply, the TRIG pin notices and the cycle
        starts again. That's why THR and TRIG share one net: both watch the same capacitor.
      </p>
      <Formula>f ≈ 1.44 / ((R1 + 2·R2) · C1) = 1.44 / ((1k + 94k) · 10µF) ≈ 1.5 Hz</Formula>
      <Figure label="Fig 1" caption="Change the parts and watch the blink. The green trace is C1 charging and draining between ⅓ and ⅔ of the supply; the amber trace is the output that drives the LED." bg="card">
        <Astable />
      </Figure>
      <p>
        Because C1 charges through two resistors but drains through only one, the LED is on slightly longer than it is off. With
        R2 much bigger than R1, as in Blinky, the <strong>duty cycle</strong> stays close to 50%.
      </p>
      <Callout kind="tip" title="The schematic check is your friend">
        EasyEDA calls its schematic check DRC too. It catches things like a net that touches only one pin, which usually means a
        wire stopped just short. Run it every time before you convert to a PCB.
      </Callout>
    </>
  )
}

const lesson: LessonContent = {
  Scene,
  goal: 'Wire up Blinky. Click a pin to start a wire, click to add corners, and click another pin, flag or wire to finish it.',
  missions: [
    { id: 'first', text: 'Draw your first wire from one pin to another pin, flag or wire' },
    { id: 'vcc', text: 'Complete the VCC net: J1, the 555 (pins 8 and 4), R1 and C2 all joined' },
    { id: 'clean', text: 'Complete all 7 nets with no shorts, so the schematic check passes' },
    { id: 'fix', text: 'Fix a mistake: remove a wire with Undo or Delete' },
  ],
  Article,
  build: {
    intro: <>Draw Blinky for real in EasyEDA Pro. Open the schematic in your Blinky project first.</>,
    steps: [
      {
        title: 'Place the parts',
        menu: ['Place', 'Device'],
        keys: ['Shift+F'],
        body: (
          <>
            Place the parts you chose in <em>Choosing parts &amp; reading datasheets</em>: the NE555, three 0805 resistors, three
            0805 capacitors, a red 0805 LED and a 2-pin header. Press <b>Space</b> to rotate a part.
          </>
        ),
      },
      {
        title: 'Draw the wires',
        keys: ['W', 'Alt+W'],
        body: (
          <>
            The wire key depends on your shortcut theme: <b>W</b> in the Standard theme, <b>Alt+W</b> in the Professional theme.
            Click a pin end, click for corners, and click another pin to finish.
          </>
        ),
      },
      {
        title: 'Label the THR net',
        keys: ['N'],
        body: <>Press N and click a THR label onto the wire by the 555 and onto the wire between R2 and C1.</>,
      },
      {
        title: 'Add VCC and GND flags',
        menu: ['Place', 'Net Flag'],
        body: <>Pick Power for VCC and Ground for GND, and drop them on the supply and ground wires.</>,
      },
      {
        title: 'Annotate designators',
        menu: ['Design', 'Annotate Designator'],
        body: <>Makes sure every part has a unique name such as R1, R2 and R3.</>,
      },
      {
        title: 'Check the schematic',
        menu: ['Design', 'Check DRC'],
        body: <>Results appear in the bottom panel. Fix every error, then save.</>,
      },
    ],
    tip: <>Pressed W and nothing happened? Your shortcut theme may differ. Look the command up, or change it, under Settings › Shortcuts.</>,
  },
  quiz: [
    {
      q: 'Where must a wire end to connect to a pin?',
      options: ['Anywhere on the symbol body', 'Exactly on the end of the pin', 'Within one grid square of the pin', 'On the pin number'],
      answer: 1,
      explain: 'Connections are made at the pin end. A wire that stops a grid square short looks right but is not connected.',
    },
    {
      q: 'Why do tidy schematics avoid four wires meeting at one junction?',
      options: ['EasyEDA forbids it', 'It uses more copper', 'It can be mistaken for two wires crossing', 'It slows the circuit down'],
      answer: 2,
      explain: 'A faint or missing dot would turn a join into an apparent crossing. Two separate T-junctions remove the doubt.',
    },
    {
      q: 'With R1 = 1kΩ, R2 = 47kΩ and C1 = 10µF, roughly how fast does Blinky blink?',
      options: ['About 1.5 times a second', 'About 15 times a second', 'Once every 10 seconds', '1,000 times a second'],
      answer: 0,
      explain: 'f ≈ 1.44 / ((1k + 2·47k) · 10µF) = 1.44 / 0.95 ≈ 1.5 Hz.',
    },
    {
      q: "In EasyEDA Pro, where do you set a resistor's footprint and supplier part number?",
      options: ['In the Property panel after selecting the part', 'In the Layers panel', 'In the top toolbar', 'You can only set them on the PCB'],
      answer: 0,
      explain: 'The Property panel on the right edits whatever is selected, including footprint, supplier and part numbers.',
    },
  ],
  terms: [
    { term: 'Wire', def: 'A line on the schematic that electrically joins the pins it touches.' },
    { term: 'Junction', def: 'A dot where one wire ends on another. It marks a real connection.' },
    { term: 'Annotate', def: 'Give every part a unique designator such as R1, R2 and U1.' },
    { term: 'Schematic DRC', def: 'EasyEDA’s automatic check of the schematic for problems such as single-pin nets.' },
    { term: 'Astable', def: 'A circuit that keeps flipping between two states on its own, like Blinky’s 555.' },
    { term: 'Duty cycle', def: 'The share of each cycle that the output is high, as a percentage.' },
    { term: 'C-number', def: 'An LCSC part number such as C21190, used to order the exact part and for factory assembly.' },
  ],
}

export default lesson
