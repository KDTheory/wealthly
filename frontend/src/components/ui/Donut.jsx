// Donut — SVG manuel, segments concentriques sur cercle r=48, stroke-width 14.
// data: [{ name, value, color }]
export function Donut({ data = [], size = 140, stroke = 14, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-sunk)" strokeWidth={stroke}/>
      {total > 0 && data.map((d, i) => {
        const frac = d.value / total;
        const dash = frac * C;
        const el = (
          <circle
            key={i}
            cx={size/2} cy={size/2} r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${C - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
          />
        );
        offset += dash;
        return el;
      })}
      {centerLabel && (
        <text x={size/2} y={size/2 - 6} textAnchor="middle"
              fontSize="10" fontWeight="500" letterSpacing="1.2"
              fill="var(--ink-3)" style={{ textTransform: 'uppercase' }}>
          {centerLabel}
        </text>
      )}
      {centerValue && (
        <text x={size/2} y={size/2 + 12} textAnchor="middle"
              fontSize="16" fontWeight="500"
              fill="var(--ink)"
              style={{ fontVariantNumeric: 'tabular-nums' }}>
          {centerValue}
        </text>
      )}
    </svg>
  );
}
