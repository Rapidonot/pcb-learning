/* Bench tools drawn in screen pixels (they keep a constant size while the board zooms). Tip at (0, 0). */

export function ToolDefs() {
  return (
    <defs>
      <linearGradient id="l17t-steel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f3f5f7" />
        <stop offset="0.35" stopColor="#c2c8cf" />
        <stop offset="0.6" stopColor="#eef1f4" />
        <stop offset="1" stopColor="#7d858e" />
      </linearGradient>
      <linearGradient id="l17t-tip" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#f6f7f8" />
        <stop offset="0.18" stopColor="#c9ced3" />
        <stop offset="0.3" stopColor="#5d6268" />
        <stop offset="1" stopColor="#8a9097" />
      </linearGradient>
      <linearGradient id="l17t-heat" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8b6a3e" />
        <stop offset="0.35" stopColor="#6b5b8e" />
        <stop offset="0.7" stopColor="#a9b0b8" />
        <stop offset="1" stopColor="#c8cdd3" />
      </linearGradient>
      <linearGradient id="l17t-grip" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4a6f8f" />
        <stop offset="0.3" stopColor="#2e4c68" />
        <stop offset="1" stopColor="#152536" />
      </linearGradient>
      <linearGradient id="l17t-gripcap" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3a3b40" />
        <stop offset="0.4" stopColor="#222327" />
        <stop offset="1" stopColor="#0d0d10" />
      </linearGradient>
      <linearGradient id="l17t-red" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ff8a7a" />
        <stop offset="0.3" stopColor="#e2382a" />
        <stop offset="1" stopColor="#8e1810" />
      </linearGradient>
      <linearGradient id="l17t-black" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6b6c72" />
        <stop offset="0.3" stopColor="#2a2b30" />
        <stop offset="1" stopColor="#0c0c0e" />
      </linearGradient>
      <pattern id="l17t-braid" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="5" height="5" fill="#c47a3c" />
        <rect width="2.5" height="5" fill="#e9a463" />
        <rect y="0" width="5" height="1" fill="#8d4f1e" opacity="0.6" />
      </pattern>
      <pattern id="l17t-braidUsed" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="5" height="5" fill="#aeb4ba" />
        <rect width="2.5" height="5" fill="#e8ebee" />
        <rect y="0" width="5" height="1" fill="#6f767d" opacity="0.6" />
      </pattern>
      <filter id="l17t-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="6" dy="10" stdDeviation="5" floodColor="#1a1208" floodOpacity="0.35" />
      </filter>
    </defs>
  )
}

/** Soldering iron, pointing at (0,0) from the lower right. */
export function Iron({ hot = true }: { hot?: boolean }) {
  return (
    <g transform="rotate(-38)" filter="url(#l17t-shadow)">
      {/* cable */}
      <path d="M 282 0 C 330 0 350 30 420 60" fill="none" stroke="#1c1d21" strokeWidth={7} strokeLinecap="round" />
      {/* tip: a fine conical bit, tinned at the very end */}
      <path d="M 0 0 L 6 -1.6 L 38 -4.6 L 38 4.6 L 6 1.6 Z" fill="url(#l17t-tip)" />
      <path d="M 0 0 L 6 -1.6 L 38 -4.6 L 38 -2.4 L 6 -0.6 Z" fill="#fff" opacity={0.4} />
      {/* collar nut */}
      <rect x={38} y={-7} width={13} height={14} rx={2} fill="url(#l17t-steel)" />
      {[41, 44, 47].map((x) => (
        <line key={x} x1={x} y1={-6.4} x2={x} y2={6.4} stroke="#7d858e" strokeWidth={0.8} opacity={0.7} />
      ))}
      {/* heater shaft with heat tint */}
      <rect x={51} y={-5.5} width={78} height={11} rx={2} fill="url(#l17t-steel)" />
      <rect x={51} y={-5.5} width={34} height={11} rx={2} fill="url(#l17t-heat)" opacity={0.55} />
      <rect x={53} y={-4} width={74} height={2} rx={1} fill="#fff" opacity={0.55} />
      {/* grip */}
      <path d="M 129 -9 L 140 -12 L 262 -12 Q 284 -12 284 0 Q 284 12 262 12 L 140 12 L 129 9 Z" fill="url(#l17t-grip)" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={146 + i * 9} y={-12} width={4} height={24} rx={2} fill="#000" opacity={0.18} />
      ))}
      <path d="M 140 -9 L 262 -9" stroke="#fff" strokeOpacity={0.28} strokeWidth={2.4} strokeLinecap="round" />
      <rect x={124} y={-9.5} width={10} height={19} rx={3} fill="url(#l17t-gripcap)" />
      {hot && <circle cx={2} cy={0} r={3.4} fill="#ffb15a" opacity={0.25} />}
    </g>
  )
}

/** Fine-tipped tweezers holding something at (0,0), coming from the upper right. */
export function Tweezers() {
  return (
    <g transform="rotate(-128)" filter="url(#l17t-shadow)">
      <path d="M 0 -1.4 L 150 -9 L 152 -5 L 4 0.2 Z" fill="url(#l17t-steel)" />
      <path d="M 0 1.4 L 150 9 L 152 5 L 4 -0.2 Z" fill="url(#l17t-steel)" />
      <path d="M 148 -9 Q 168 0 148 9" fill="none" stroke="#9aa1a8" strokeWidth={3} />
      <rect x={70} y={-6.8} width={46} height={2.4} rx={1.2} fill="#7d858e" opacity={0.45} transform="rotate(-3 70 -6)" />
      <rect x={70} y={4.4} width={46} height={2.4} rx={1.2} fill="#7d858e" opacity={0.45} transform="rotate(3 70 6)" />
    </g>
  )
}

/** Desoldering braid pressed at (0,0), running off to the lower left. */
export function Wick({ used }: { used: boolean }) {
  return (
    <g transform="rotate(32)" filter="url(#l17t-shadow)">
      <rect x={-210} y={-8} width={222} height={16} rx={2} fill="url(#l17t-braid)" />
      <rect x={-14} y={-8} width={26} height={16} rx={2} fill="url(#l17t-braidUsed)" opacity={used ? 1 : 0} style={{ transition: 'opacity 0.6s 0.3s' }} />
      <rect x={-210} y={-8} width={222} height={4} fill="#fff" opacity={0.18} />
      {/* the spool it comes from */}
      <circle cx={-232} cy={0} r={28} fill="#2e6f9e" />
      <circle cx={-232} cy={0} r={20} fill="#c47a3c" />
      <circle cx={-232} cy={0} r={7} fill="#1b3f5c" />
    </g>
  )
}

/** A length of solder wire feeding into (0,0) from the lower left. */
export function SolderWire() {
  return (
    <g filter="url(#l17t-shadow)">
      <path d="M 0 0 C -18 22 -40 30 -80 44 C -120 58 -150 90 -170 130" fill="none" stroke="#8d949b" strokeWidth={3.6} strokeLinecap="round" />
      <path d="M 0 0 C -18 22 -40 30 -80 44 C -120 58 -150 90 -170 130" fill="none" stroke="#eef1f3" strokeWidth={1.2} strokeLinecap="round" opacity={0.8} />
    </g>
  )
}

/** Multimeter probe touching (0,0); body runs off at `angle` degrees. */
export function Probe({ color, angle, active }: { color: 'red' | 'black'; angle: number; active?: boolean }) {
  const body = color === 'red' ? 'url(#l17t-red)' : 'url(#l17t-black)'
  return (
    <g transform={`rotate(${angle})`} filter="url(#l17t-shadow)">
      <rect x={0} y={-1.1} width={26} height={2.2} rx={1} fill="url(#l17t-steel)" />
      <path d="M 26 -3 L 34 -5.5 L 34 5.5 L 26 3 Z" fill={body} />
      <rect x={34} y={-11} width={6} height={22} rx={2.5} fill={body} />
      <path d="M 40 -6.5 L 132 -7.5 Q 140 -7.5 140 0 Q 140 7.5 132 7.5 L 40 6.5 Z" fill={body} />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={52 + i * 7} y={-6.6} width={3} height={13.2} rx={1.5} fill="#000" opacity={0.16} />
      ))}
      <path d="M 44 -4.5 L 132 -5" stroke="#fff" strokeOpacity={0.35} strokeWidth={2} strokeLinecap="round" />
      {active && <circle r={5} fill="none" stroke="#fff" strokeWidth={1.5} opacity={0.9} />}
    </g>
  )
}

/** End point of a probe's cable, relative to its tip, for a given angle. */
export function probeTail(angle: number): [number, number] {
  const a = (angle * Math.PI) / 180
  return [Math.cos(a) * 140, Math.sin(a) * 140]
}
