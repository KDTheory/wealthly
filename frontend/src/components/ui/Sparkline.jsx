// Sparkline — SVG manuel, perf-friendly. 80×24 par défaut.
// Couleur dérivée du trend (last vs first) sauf si props color.
export function Sparkline({ data = [], width = 80, height = 24, color, strokeWidth = 1.5, className = '' }) {
  if (!data.length) return <svg width={width} height={height} className={className}/>;
  const pts = data.map(d => typeof d === 'number' ? d : d.value);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const stepX = pts.length > 1 ? width / (pts.length - 1) : 0;
  const path = pts.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const trend = pts[pts.length - 1] - pts[0];
  const stroke = color || (trend > 0 ? 'var(--positive)' : trend < 0 ? 'var(--negative)' : 'var(--ink-2)');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <path d={path} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
