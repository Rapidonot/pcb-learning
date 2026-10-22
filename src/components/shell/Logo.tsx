/** Isometric little circuit board — the Learn PCB mark. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      {/* board edge */}
      <path d="M20 8 36 17v3L20 29 4 20v-3z" fill="var(--mask-3)" />
      {/* board top */}
      <path d="M20 6 36 15 20 24 4 15z" fill="var(--mask)" />
      <path d="M20 6 36 15 20 24 4 15z" fill="none" stroke="var(--mask-hi)" strokeWidth="0.6" />
      {/* traces */}
      <path d="M11 15.2 16 12.4l5 2.8 4.5-2.5" fill="none" stroke="var(--copper-light)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 17.5l4.5-2.5M23.5 17.4l3-1.7" fill="none" stroke="var(--copper-light)" strokeWidth="1.3" strokeLinecap="round" />
      {/* chip */}
      <path d="M20 12.2l4 2.25-4 2.25-4-2.25z" fill="var(--plastic)" />
      <path d="M16 14.45v1.2l4 2.25v-1.2zM24 14.45v1.2l-4 2.25v-1.2z" fill="var(--plastic-2)" />
      {/* pads */}
      <ellipse cx="11" cy="15.2" rx="1.5" ry="0.85" fill="var(--silk)" />
      <ellipse cx="26.5" cy="15.7" rx="1.5" ry="0.85" fill="var(--silk)" />
      <ellipse cx="15" cy="17.5" rx="1.5" ry="0.85" fill="var(--silk)" />
    </svg>
  )
}
