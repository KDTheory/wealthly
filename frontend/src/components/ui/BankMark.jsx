// BankMark — pastille 32px avec lettres mono blanches, couleur par banque.
const COLORS = {
  boursobank:    '#1A1A1A',
  boursorama:    '#1A1A1A',
  revolut:       '#0075EB',
  'crédit agricole': '#009530',
  'credit agricole': '#009530',
  ca:            '#009530',
  fortuneo:      '#E20613',
  linxea:        '#5A0FAB',
  'trade republic': '#0E1B4D',
  traderepublic: '#0E1B4D',
  bnp:           '#009286',
  'la banque postale': '#FFCD00',
  bpc:           '#FFCD00',
  sg:            '#E2001A',
  'société générale': '#E2001A',
  'societe generale': '#E2001A',
  ing:           '#FF6200',
  n26:           '#48F2BB',
  hellobank:     '#009286',
};

const initials = (name) => {
  if (!name) return '??';
  const tokens = name.trim().split(/\s+/);
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return (tokens[0][0] + tokens[1][0]).toUpperCase();
};

export function BankMark({ bank, name, size = 32, className = '', style }) {
  const key = (bank || name || '').toLowerCase().trim();
  const color = COLORS[key] || stringToColor(bank || name || '?');
  const label = initials(bank || name);
  return (
    <div
      className={`ds-bank-mark ${className}`}
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size <= 24 ? 9 : 11,
        ...style,
      }}
    >
      {label}
    </div>
  );
}

// Stable hash → fallback color for unknown banks (soft, not garish).
function stringToColor(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 45% 32%)`;
}
