/**
 * Wealthly — bilan PDF generator (rewrite, 2026-05-06).
 *
 * Multi-page A4 report:
 *   1. Cover                — wordmark, big title, date, foyer, page count
 *   2. Synthèse             — net worth hero, KPIs, allocation horizontal bar
 *   3. Évolution            — table of monthly snapshots with sparkline
 *   4. Trésorerie du mois   — revenus/dépenses/épargne, top 5 cat, charges fixes
 *   5. Détail               — comptes, actifs (avec PV latente), dettes
 *
 * Pure function. Pass props in, get a downloaded file out.
 *
 * Style = sober black on cream, gold accent rules, signature gold strip on the
 * left of every KPI block. Mirrors the app's "private banking" direction so a
 * printed copy still feels brand.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ---------- Palette (RGB tuples for jsPDF) ----------
const C = {
  ink:        [22, 20, 14],
  body:       [60, 56, 48],
  muted:      [110, 102, 89],
  faint:      [155, 146, 132],
  rule:       [228, 222, 208],
  hairline:   [238, 232, 218],
  paper:      [253, 251, 246],
  cream:      [248, 244, 234],
  cardFill:   [251, 247, 238],
  gold:       [160, 133, 85],
  goldDark:   [122, 100, 62],
  sage:       [110, 140, 97],
  terracotta: [173, 95, 72],
  amber:      [200, 160, 70],
  pieClasses: [
    [160, 133, 85],   // gold
    [122, 138, 168],  // slate-blue
    [173, 95, 72],    // terracotta
    [110, 140, 97],   // sage
    [157, 139, 181],  // mauve
    [200, 160, 70],   // amber
    [148, 142, 138],  // warm gray
  ],
};

const FONT = 'helvetica';
const PAGE_M = 42;          // page horizontal margin (pt)

// ---------- helpers ----------
const fmtEUR = (v, opts = {}) => {
  const { compact = false, sign = false } = opts;
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
    minimumFractionDigits: 0,
  }).format(Math.abs(v || 0));
  if (sign && v > 0) return `+${formatted}`;
  if (v < 0) return `−${formatted}`;
  return formatted;
};
const fmtPct = (v, d = 1) => (v == null ? '—' : `${v.toFixed(d)} %`);
const todayLong = () => new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
function monthLong(monthKey) {
  if (!monthKey) return '';
  const [y, m] = monthKey.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}
function monthShort(monthKey) {
  if (!monthKey) return '';
  const [y, m] = monthKey.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

// ---------- chrome ----------
function paintBackground(doc) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(...C.paper);
  doc.rect(0, 0, w, h, 'F');
}

function drawHeader(doc, subtitle) {
  const w = doc.internal.pageSize.getWidth();
  const x = PAGE_M;
  const y = 36;

  // Monogram square — gold stroke + interior W glyph
  doc.setDrawColor(...C.gold);
  doc.setFillColor(...C.cardFill);
  doc.setLineWidth(0.7);
  doc.roundedRect(x, y - 12, 18, 18, 2, 2, 'FD');
  doc.setDrawColor(...C.goldDark);
  doc.setLineWidth(0.7);
  doc.lines([[2.4, 6.5], [2.4, -5], [2.4, 5], [2.4, -6.5]], x + 3, y - 5.5);

  // Wordmark
  doc.setFont(FONT, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.ink);
  doc.text('Wealthly', x + 26, y);

  // Subtitle on the right
  if (subtitle) {
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text(subtitle, w - PAGE_M, y, { align: 'right' });
  }

  // Hairline rule
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.4);
  doc.line(PAGE_M, y + 10, w - PAGE_M, y + 10);
}

function drawFooter(doc, page, total) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...C.hairline);
  doc.setLineWidth(0.4);
  doc.line(PAGE_M, h - 38, w - PAGE_M, h - 38);
  doc.setFont(FONT, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.faint);
  doc.text('Document confidentiel · Wealthly', PAGE_M, h - 22);
  doc.text(`${page} / ${total}`, w - PAGE_M, h - 22, { align: 'right' });
}

function drawSection(doc, y, title) {
  doc.setFont(FONT, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.gold);
  doc.text(title.toUpperCase(), PAGE_M, y, { charSpace: 1.6 });
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.6);
  doc.line(PAGE_M, y + 3, PAGE_M + 16, y + 3);
}

function drawTitle(doc, y, title, sub) {
  doc.setFont(FONT, 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...C.ink);
  doc.text(title, PAGE_M, y);
  if (sub) {
    doc.setFont(FONT, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...C.muted);
    doc.text(sub, PAGE_M, y + 18);
  }
}

// Hero: a single big number with eyebrow + meta. Returns next y.
function drawHero(doc, y, eyebrow, value, meta, color = C.ink) {
  doc.setFont(FONT, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...C.gold);
  doc.text(eyebrow.toUpperCase(), PAGE_M, y, { charSpace: 2 });

  doc.setFont(FONT, 'bold');
  doc.setFontSize(38);
  doc.setTextColor(...color);
  doc.text(value, PAGE_M, y + 38);

  if (meta) {
    doc.setFont(FONT, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...C.muted);
    doc.text(meta, PAGE_M, y + 56);
    return y + 70;
  }
  return y + 50;
}

// 2×N grid of KPI cards: cream fill + gold left strip + label / value / hint.
function drawKpiCards(doc, y, kpis) {
  const w = doc.internal.pageSize.getWidth();
  const colW = (w - PAGE_M * 2 - 12) / 2;
  const rowH = 54;
  kpis.forEach((kpi, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = PAGE_M + col * (colW + 12);
    const yy = y + row * (rowH + 8);

    // Fill
    doc.setFillColor(...C.cardFill);
    doc.roundedRect(x, yy, colW, rowH, 4, 4, 'F');
    // Gold left strip
    doc.setFillColor(...C.gold);
    doc.rect(x, yy, 2, rowH, 'F');

    doc.setFont(FONT, 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(kpi.label.toUpperCase(), x + 12, yy + 14, { charSpace: 1.4 });

    doc.setFont(FONT, 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...(kpi.color || C.ink));
    doc.text(kpi.value, x + 12, yy + 36);

    if (kpi.hint) {
      doc.setFont(FONT, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.faint);
      doc.text(kpi.hint, x + 12, yy + 48);
    }
  });
  const rows = Math.ceil(kpis.length / 2);
  return y + rows * (rowH + 8) + 4;
}

// Horizontal stacked bar: each segment proportional to its value, colored
// from `pieClasses`. Drawn under the section header. Returns next y.
function drawAllocBar(doc, y, segments) {
  const w = doc.internal.pageSize.getWidth();
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const barW = w - PAGE_M * 2;
  const barH = 14;

  // Fill segments
  let cursor = PAGE_M;
  segments.forEach((seg, i) => {
    const segW = (seg.value / total) * barW;
    doc.setFillColor(...(seg.color || C.pieClasses[i % C.pieClasses.length]));
    doc.rect(cursor, y, segW, barH, 'F');
    cursor += segW;
  });
  // Hairline outline
  doc.setDrawColor(...C.hairline);
  doc.setLineWidth(0.5);
  doc.rect(PAGE_M, y, barW, barH);

  // Legend below: 2-column wrap
  const legendY = y + barH + 14;
  const colW = (w - PAGE_M * 2) / 2;
  segments.forEach((seg, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const lx = PAGE_M + col * colW;
    const ly = legendY + row * 14;

    doc.setFillColor(...(seg.color || C.pieClasses[i % C.pieClasses.length]));
    doc.circle(lx + 3, ly - 3, 3, 'F');

    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.body);
    doc.text(seg.name, lx + 12, ly);

    doc.setFont(FONT, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.ink);
    const pct = ((seg.value / total) * 100).toFixed(1);
    const right = lx + colW - 12;
    doc.text(`${pct} %`, right, ly, { align: 'right' });
  });
  const rows = Math.ceil(segments.length / 2);
  return legendY + rows * 14 + 8;
}

// Sparkline polyline of monthly balances inside a small rect. Returns next y.
function drawSparkline(doc, x, y, w, h, points, label) {
  if (label) {
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(label, x, y - 4);
  }
  if (!points || points.length < 2) {
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.faint);
    doc.text('Pas encore assez de données', x, y + h / 2);
    return y + h;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  // Soft baseline grid
  doc.setDrawColor(...C.hairline);
  doc.setLineWidth(0.3);
  doc.line(x, y + h, x + w, y + h);

  // Polyline
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(1.1);
  for (let i = 1; i < points.length; i++) {
    const x1 = x + ((i - 1) / (points.length - 1)) * w;
    const x2 = x + (i / (points.length - 1)) * w;
    const y1 = y + h - ((points[i - 1] - min) / range) * h;
    const y2 = y + h - ((points[i] - min) / range) * h;
    doc.line(x1, y1, x2, y2);
  }
  // Endpoint dot
  doc.setFillColor(...C.gold);
  doc.circle(x + w, y + h - ((points[points.length - 1] - min) / range) * h, 1.6, 'F');
  return y + h;
}

// Wrapper around autoTable for a consistent sober look.
function table(doc, head, body, startY, opts = {}) {
  autoTable(doc, {
    startY,
    head,
    body,
    theme: 'plain',
    styles: {
      font: FONT,
      fontSize: 9,
      textColor: C.body,
      cellPadding: { top: 7, right: 8, bottom: 7, left: 0 },
      lineColor: C.hairline,
      lineWidth: 0,
    },
    headStyles: {
      fontSize: 7,
      fontStyle: 'bold',
      textColor: C.muted,
      fillColor: false,
      lineWidth: { bottom: 0.6 },
      lineColor: C.gold,
      cellPadding: { top: 4, right: 8, bottom: 6, left: 0 },
      ...((opts.headStyles) || {}),
    },
    bodyStyles: {
      lineWidth: { bottom: 0.3 },
      lineColor: C.hairline,
      ...((opts.bodyStyles) || {}),
    },
    margin: { left: PAGE_M, right: PAGE_M },
    didDrawPage: opts.didDrawPage,
    ...opts,
  });
  return doc.lastAutoTable.finalY;
}

// ---------- health-score (mirrors HealthScore.jsx — duplicated here so the
// PDF doesn't depend on the React component) ----------
function lerp(value, inMin, inMax, outMin, outMax) {
  if (value <= inMin) return outMin;
  if (value >= inMax) return outMax;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function computeHealthScore({ monthlyEvolution = [], liquidWealth = 0, assetsValue = 0, liabilitiesValue = 0, visibleAssets = [], ASSET_CLASS_MAP = {} }) {
  const window = monthlyEvolution.slice(-6);
  const avg = (key) => window.length === 0 ? 0 : window.reduce((s, m) => s + (m[key] || 0), 0) / window.length;
  const avgIncome = avg('income');
  const avgExpenses = avg('expenses');
  const avgNet = avg('net');

  const savingsRate = avgIncome > 0 ? avgNet / avgIncome : 0;
  const savingsPts = lerp(savingsRate, 0.05, 0.30, 0, 25);

  const monthsOfRunway = avgExpenses > 0 ? liquidWealth / avgExpenses : (liquidWealth > 0 ? 99 : 0);
  const emergencyPts = lerp(monthsOfRunway, 0, 3, 0, 20);

  const totalWealth = assetsValue + liquidWealth;
  const debtRatio = totalWealth > 0 ? liabilitiesValue / totalWealth : 0;
  const debtPts = liabilitiesValue === 0 ? 20 : lerp(debtRatio, 0.20, 0.80, 20, 0);

  const classes = new Set();
  visibleAssets.forEach((a) => {
    const cls = ASSET_CLASS_MAP?.[a.type]?.class;
    if (cls) classes.add(cls);
  });
  if (liquidWealth > 0) classes.add('Liquidités');
  const divCount = classes.size;
  const divPts = lerp(divCount, 0, 3, 0, 20);

  // We don't have budgets in the PDF call signature — full credit by default.
  const budgetPts = 15;

  return {
    total: Math.round(savingsPts + emergencyPts + debtPts + divPts + budgetPts),
    savingsRate, monthsOfRunway, debtRatio, divCount,
  };
}

// ---------- main ----------
export function generateBilanPdf({
  netWorth,
  liquidWealth,
  assetsValue,
  liabilitiesValue,
  thisMonthStats,
  monthlyEvolution,
  visibleAccounts,
  accountBalances,
  visibleAssets,
  visibleLiabilities,
  members,
  activeMemberId,
  recurringGroups,
  categoryAnalysis,
  categories,
  memberShare,
  currentMonth,
  ASSET_CLASS_MAP,
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const activeMember = members.find((m) => m.id === activeMemberId);
  const headerSubtitle = `${activeMember ? activeMember.name + ' · ' : ''}${todayLong()}`;

  // Performance vs previous month
  const sorted = [...monthlyEvolution].sort((a, b) => a.month.localeCompare(b.month));
  let perf1m = null;
  if (sorted.length >= 2) {
    const last = sorted[sorted.length - 1].balance;
    const prev = sorted[sorted.length - 2].balance;
    if (prev !== 0) perf1m = ((last - prev) / Math.abs(prev)) * 100;
  }
  const debtRatio = (assetsValue + liquidWealth) > 0 ? (liabilitiesValue / (assetsValue + liquidWealth)) * 100 : null;
  const score = computeHealthScore({ monthlyEvolution, liquidWealth, assetsValue, liabilitiesValue, visibleAssets, ASSET_CLASS_MAP });
  const scoreColor = score.total < 40 ? C.terracotta : score.total < 70 ? C.amber : C.sage;

  // ----- COVER -----
  paintBackground(doc);
  // Big monogram top center-ish
  doc.setDrawColor(...C.gold);
  doc.setFillColor(...C.cardFill);
  doc.setLineWidth(1);
  doc.roundedRect(PAGE_M, 70, 38, 38, 4, 4, 'FD');
  doc.setDrawColor(...C.goldDark);
  doc.setLineWidth(1.2);
  doc.lines([[5, 13], [5, -10], [5, 10], [5, -13]], PAGE_M + 7, 81);

  doc.setFont(FONT, 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...C.gold);
  doc.text('WEALTHLY', PAGE_M + 50, 95, { charSpace: 2 });

  // Big title block, centered vertically
  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...C.gold);
  doc.text('BILAN PATRIMONIAL', PAGE_M, 220, { charSpace: 3 });

  doc.setFont(FONT, 'bold');
  doc.setFontSize(48);
  doc.setTextColor(...C.ink);
  const titleLines = [activeMember ? activeMember.name : 'Foyer', 'Synthèse au'];
  doc.text(titleLines[0], PAGE_M, 270);
  doc.setFont(FONT, 'normal');
  doc.setFontSize(34);
  doc.setTextColor(...C.body);
  doc.text(todayLong(), PAGE_M, 312);

  // Net worth hero on the cover
  doc.setDrawColor(...C.hairline);
  doc.setLineWidth(0.5);
  doc.line(PAGE_M, 360, pageW - PAGE_M, 360);

  doc.setFont(FONT, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...C.gold);
  doc.text('PATRIMOINE NET', PAGE_M, 388, { charSpace: 2 });
  doc.setFont(FONT, 'bold');
  doc.setFontSize(56);
  doc.setTextColor(...C.ink);
  doc.text(fmtEUR(netWorth), PAGE_M, 446);

  // Mini stats row
  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...C.muted);
  const stats = [
    `${fmtEUR(liquidWealth)} liquidités`,
    `${fmtEUR(assetsValue)} actifs`,
    liabilitiesValue > 0 ? `−${fmtEUR(liabilitiesValue)} dettes` : null,
  ].filter(Boolean);
  doc.text(stats.join('   ·   '), PAGE_M, 470);

  // Score santé bottom-right pill
  doc.setFillColor(...C.cardFill);
  doc.roundedRect(PAGE_M, 510, 240, 50, 6, 6, 'F');
  doc.setFillColor(...scoreColor);
  doc.rect(PAGE_M, 510, 3, 50, 'F');
  doc.setFont(FONT, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text('SCORE DE SANTÉ', PAGE_M + 12, 525, { charSpace: 2 });
  doc.setFont(FONT, 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...scoreColor);
  doc.text(`${score.total}`, PAGE_M + 12, 552);
  doc.setFont(FONT, 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...C.muted);
  doc.text('/ 100', PAGE_M + 56, 552);
  const ratingLabel = score.total < 40 ? 'À surveiller' : score.total < 70 ? 'Correct' : 'Solide';
  doc.setFont(FONT, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...scoreColor);
  doc.text(ratingLabel.toUpperCase(), PAGE_M + 100, 552, { charSpace: 1.5 });

  // Footer of cover: confidential mention + page count placeholder
  doc.setFont(FONT, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.faint);
  doc.text('Document confidentiel · à conserver', PAGE_M, pageH - 50);
  doc.text(`Généré le ${todayLong()}`, pageW - PAGE_M, pageH - 50, { align: 'right' });

  // ----- PAGE 2 — Synthèse -----
  doc.addPage(); paintBackground(doc); drawHeader(doc, headerSubtitle);
  let y = 90;
  drawTitle(doc, y, 'Synthèse', `Composition du patrimoine au ${todayLong()}`);
  y += 50;

  drawSection(doc, y, 'Indicateurs clés'); y += 14;
  y = drawKpiCards(doc, y, [
    { label: 'Patrimoine net', value: fmtEUR(netWorth), hint: 'liquidités + actifs − dettes' },
    {
      label: 'Performance 1 mois',
      value: perf1m == null ? '—' : `${perf1m >= 0 ? '+' : ''}${perf1m.toFixed(2)} %`,
      color: perf1m == null ? C.muted : perf1m >= 0 ? C.sage : C.terracotta,
      hint: 'sur les liquidités',
    },
    { label: 'Liquidités', value: fmtEUR(liquidWealth), hint: `${visibleAccounts.length} compte${visibleAccounts.length > 1 ? 's' : ''}` },
    { label: 'Actifs', value: fmtEUR(assetsValue), hint: `${visibleAssets.length} ligne${visibleAssets.length > 1 ? 's' : ''}` },
    { label: 'Dettes', value: liabilitiesValue > 0 ? `−${fmtEUR(liabilitiesValue)}` : fmtEUR(0), color: liabilitiesValue > 0 ? C.terracotta : C.muted, hint: `${visibleLiabilities.length} prêt${visibleLiabilities.length > 1 ? 's' : ''}` },
    { label: "Ratio d'endettement", value: fmtPct(debtRatio), color: debtRatio == null ? C.muted : debtRatio < 30 ? C.sage : debtRatio < 50 ? C.amber : C.terracotta, hint: debtRatio == null ? '' : debtRatio < 30 ? 'sain' : debtRatio < 50 ? 'surveillé' : 'élevé' },
  ]);

  // Allocation
  y += 6;
  drawSection(doc, y, 'Allocation par classe'); y += 14;
  const allocClasses = {};
  if (liquidWealth > 0) allocClasses['Liquidités'] = liquidWealth;
  visibleAssets.forEach((a) => {
    const cls = ASSET_CLASS_MAP?.[a.type]?.class || 'Divers';
    const val = (parseFloat(a.currentValue) || 0) * memberShare(a);
    allocClasses[cls] = (allocClasses[cls] || 0) + val;
  });
  const allocSegments = Object.entries(allocClasses)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name, value, color: C.pieClasses[i % C.pieClasses.length] }));
  if (allocSegments.length > 0) {
    y = drawAllocBar(doc, y, allocSegments);
  } else {
    doc.setFont(FONT, 'normal'); doc.setFontSize(9); doc.setTextColor(...C.faint);
    doc.text('Aucun actif renseigné.', PAGE_M, y + 10); y += 24;
  }

  drawFooter(doc, 2, 5);

  // ----- PAGE 3 — Évolution -----
  doc.addPage(); paintBackground(doc); drawHeader(doc, headerSubtitle);
  y = 90;
  drawTitle(doc, y, 'Évolution', sorted.length >= 2 ? `Sur ${Math.min(sorted.length, 12)} mois` : 'Historique disponible');
  y += 50;

  // Sparkline
  drawSection(doc, y, 'Patrimoine net mensuel'); y += 14;
  const lastN = sorted.slice(-12);
  drawSparkline(doc, PAGE_M, y + 8, pageW - PAGE_M * 2, 80, lastN.map((m) => m.balance || 0), null);
  y += 100;

  // Table of monthly evolution
  drawSection(doc, y, 'Détail mensuel'); y += 14;
  if (lastN.length === 0) {
    doc.setFont(FONT, 'normal'); doc.setFontSize(9); doc.setTextColor(...C.faint);
    doc.text('Pas encore de données mensuelles.', PAGE_M, y + 10); y += 24;
  } else {
    const evRows = lastN.slice().reverse().map((m) => [
      monthShort(m.month),
      fmtEUR(m.income),
      fmtEUR(m.expenses),
      fmtEUR(m.net, { sign: true }),
      fmtEUR(m.balance),
    ]);
    y = table(doc, [['Mois', 'Revenus', 'Dépenses', 'Solde net', 'Solde fin de mois']], evRows, y, {
      columnStyles: {
        0: { textColor: C.muted },
        1: { halign: 'right', textColor: C.sage },
        2: { halign: 'right', textColor: C.terracotta },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'right' },
      },
    });
  }

  drawFooter(doc, 3, 5);

  // ----- PAGE 4 — Trésorerie -----
  doc.addPage(); paintBackground(doc); drawHeader(doc, headerSubtitle);
  y = 90;
  drawTitle(doc, y, 'Trésorerie', monthLong(currentMonth));
  y += 50;

  drawSection(doc, y, 'Cashflow du mois'); y += 14;
  const savingsRate = thisMonthStats?.income > 0 ? (thisMonthStats.net / thisMonthStats.income) * 100 : null;
  y = drawKpiCards(doc, y, [
    { label: 'Revenus', value: fmtEUR(thisMonthStats?.income || 0), color: C.sage },
    { label: 'Dépenses', value: fmtEUR(thisMonthStats?.expenses || 0), color: C.terracotta },
    { label: 'Épargne nette', value: fmtEUR(thisMonthStats?.net || 0, { sign: true }), color: (thisMonthStats?.net || 0) >= 0 ? C.sage : C.terracotta },
    { label: "Taux d'épargne", value: fmtPct(savingsRate, 0), color: savingsRate == null ? C.muted : savingsRate >= 20 ? C.sage : savingsRate >= 10 ? C.amber : C.terracotta, hint: 'sur revenus du mois' },
  ]);

  y += 4;
  drawSection(doc, y, 'Top dépenses du mois'); y += 14;
  const topCats = Object.entries(categoryAnalysis || {})
    .filter(([, d]) => d.current > 0)
    .map(([catId, data]) => {
      const cat = categories.find((c) => c.id === catId);
      const change = data.avg3m > 0 ? ((data.current - data.avg3m) / data.avg3m) * 100 : 0;
      return { name: cat?.name || catId, current: data.current, avg: data.avg3m, change };
    })
    .sort((a, b) => b.current - a.current)
    .slice(0, 6);
  const topRows = topCats.length === 0
    ? [['—', '—', '—', '—']]
    : topCats.map((c) => [
        c.name,
        fmtEUR(c.current),
        fmtEUR(c.avg),
        Math.abs(c.change) > 5 ? `${c.change > 0 ? '+' : ''}${c.change.toFixed(0)} %` : '—',
      ]);
  y = table(doc, [['Catégorie', 'Ce mois', 'Moy. 3 mois', 'Δ']], topRows, y, {
    columnStyles: {
      1: { halign: 'right', fontStyle: 'bold' },
      2: { halign: 'right', textColor: C.muted },
      3: { halign: 'right', textColor: C.muted },
    },
  });

  y += 6;
  drawSection(doc, y, 'Charges fixes récurrentes'); y += 14;
  const recurringRows = (recurringGroups || [])
    .filter((rg) => {
      const lastDate = new Date(rg.lastDate);
      const now = new Date();
      const monthsAgo = (now.getFullYear() - lastDate.getFullYear()) * 12 + (now.getMonth() - lastDate.getMonth());
      return monthsAgo <= 2;
    })
    .map((rg) => {
      const acc = visibleAccounts.find((a) => a.id === rg.accountId);
      const share = acc ? memberShare(acc) : 1;
      return { ...rg, sharedAmount: rg.avgAmount * share, accName: acc?.name };
    })
    .sort((a, b) => Math.abs(b.sharedAmount) - Math.abs(a.sharedAmount))
    .slice(0, 12)
    .map((rg) => [
      `Le ${rg.avgDay}`,
      rg.label || '—',
      rg.accName || '—',
      fmtEUR(rg.sharedAmount),
    ]);
  if (recurringRows.length === 0) recurringRows.push(['—', '—', '—', '—']);
  y = table(doc, [['Jour', 'Libellé', 'Compte', 'Montant']], recurringRows, y, {
    columnStyles: {
      0: { textColor: C.muted, cellWidth: 50 },
      3: { halign: 'right', fontStyle: 'bold' },
    },
  });

  drawFooter(doc, 4, 5);

  // ----- PAGE 5 — Détail -----
  doc.addPage(); paintBackground(doc); drawHeader(doc, headerSubtitle);
  y = 90;
  drawTitle(doc, y, 'Détail', 'Comptes, actifs et dettes');
  y += 50;

  // Comptes
  drawSection(doc, y, 'Comptes bancaires'); y += 14;
  const accRows = visibleAccounts.length === 0
    ? [['—', '—', '—', '—']]
    : visibleAccounts.map((a) => {
        const bal = (accountBalances?.[a.id] || 0) * memberShare(a);
        const owners = (a.memberIds || []).map((id) => members.find((m) => m.id === id)?.name).filter(Boolean).join(' & ');
        return [a.name, a.bank || '—', owners || '—', fmtEUR(bal)];
      });
  y = table(doc, [['Compte', 'Banque', 'Propriétaires', 'Solde']], accRows, y, {
    columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
  });

  // Helper to maybe paginate
  const ensureSpace = (doc, neededY) => {
    if (neededY > pageH - 80) {
      drawFooter(doc, doc.internal.getNumberOfPages(), 5);
      doc.addPage(); paintBackground(doc); drawHeader(doc, headerSubtitle);
      return 90;
    }
    return neededY;
  };

  // Actifs avec PV latente si dispo
  y = ensureSpace(doc, y + 10);
  drawSection(doc, y, 'Actifs détaillés'); y += 14;
  if (visibleAssets.length === 0) {
    doc.setFont(FONT, 'normal'); doc.setFontSize(9); doc.setTextColor(...C.faint);
    doc.text('Aucun actif renseigné.', PAGE_M, y + 10); y += 24;
  } else {
    const assetRows = visibleAssets
      .slice()
      .sort((a, b) => (parseFloat(b.currentValue) || 0) * memberShare(b) - (parseFloat(a.currentValue) || 0) * memberShare(a))
      .map((a) => {
        const share = memberShare(a);
        const current = (parseFloat(a.currentValue) || 0) * share;
        const cost = (parseFloat(a.purchasePrice) || 0) * share;
        const pv = cost > 0 ? current - cost : null;
        const pvPct = cost > 0 ? (pv / cost) * 100 : null;
        return [
          a.name || '—',
          ASSET_CLASS_MAP?.[a.type]?.class || a.type || 'Divers',
          fmtEUR(current),
          cost > 0 ? fmtEUR(cost) : '—',
          pv == null ? '—' : `${pv >= 0 ? '+' : ''}${fmtEUR(pv, { sign: true })} (${pvPct >= 0 ? '+' : ''}${pvPct.toFixed(1)} %)`,
        ];
      });
    y = table(doc, [['Libellé', 'Classe', 'Valeur', 'Prix de revient', 'PV latente']], assetRows, y, {
      columnStyles: {
        2: { halign: 'right', fontStyle: 'bold' },
        3: { halign: 'right', textColor: C.muted },
        4: { halign: 'right' },
      },
    });
  }

  // Dettes
  if (visibleLiabilities.length > 0) {
    y = ensureSpace(doc, y + 10);
    drawSection(doc, y, 'Dettes en cours'); y += 14;
    const liaRows = visibleLiabilities.map((l) => {
      const share = memberShare(l);
      const remaining = (parseFloat(l.remainingCapital) || 0) * share;
      const monthly = (parseFloat(l.monthlyPayment) || 0) * share;
      return [
        l.name || '—',
        l.type || '—',
        l.interestRate ? `${parseFloat(l.interestRate).toFixed(2)} %` : '—',
        monthly > 0 ? fmtEUR(monthly) : '—',
        fmtEUR(remaining),
      ];
    });
    y = table(doc, [['Libellé', 'Type', 'Taux', 'Mensualité', 'Restant dû']], liaRows, y, {
      columnStyles: {
        2: { halign: 'right', textColor: C.muted },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold', textColor: C.terracotta },
      },
    });
  }

  drawFooter(doc, doc.internal.getNumberOfPages(), 5);

  // Save with a name like "wealthly-bilan-raphael-2026-05.pdf"
  const monthSuffix = currentMonth || new Date().toISOString().slice(0, 7);
  const memberSlug = activeMember ? `-${activeMember.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}` : '';
  doc.save(`wealthly-bilan${memberSlug}-${monthSuffix}.pdf`);
}
