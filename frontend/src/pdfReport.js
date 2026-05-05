/**
 * Wealthly — bilan PDF generator.
 *
 * Builds a multi-page A4 report (synthèse, trésorerie, détails) from the
 * same data the Dashboard already has. Pure function: pass props in,
 * get a downloaded file out.
 *
 * Style = sober black-on-cream, gold accent rules. Mirrors the app's
 * "private banking" visual direction so a printed copy still feels brand.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Brand palette translated to RGB tuples for jsPDF.
const COLORS = {
  ink: [26, 24, 18],          // dark text
  muted: [106, 99, 87],       // secondary text
  faint: [154, 146, 133],     // tertiary text
  rule: [232, 227, 214],      // hairline
  cream: [250, 248, 243],     // surface
  gold: [160, 133, 85],       // accent (deeper for print)
  sage: [110, 140, 97],       // success
  terracotta: [173, 95, 72],  // danger
};

const FONT = 'helvetica';

// ---------- helpers ----------
const fmtEUR = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);
const fmtPct = (v, d = 1) => (v == null ? '—' : `${v.toFixed(d)}%`);
const todayLong = () =>
  new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

function monthLong(monthKey) {
  if (!monthKey) return '';
  const [y, m] = monthKey.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

// Header drawn on each page: brand monogram + wordmark, plus a thin gold rule.
function drawHeader(doc, subtitle) {
  const w = doc.internal.pageSize.getWidth();
  const x = 40;
  const y = 36;

  // Monogram square — gold stroke, W glyph drawn as a polyline.
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.8);
  doc.rect(x, y - 12, 18, 18);
  doc.setLineWidth(0.8);
  doc.lines([[2.5, 7], [2.5, -5], [2.5, 5], [2.5, -7]], x + 3, y - 6);

  // Wordmark
  doc.setFont(FONT, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.ink);
  doc.text('Wealthly', x + 26, y);

  // Subtitle on the right
  if (subtitle) {
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text(subtitle, w - 40, y, { align: 'right' });
  }

  // Hairline rule
  doc.setDrawColor(...COLORS.rule);
  doc.setLineWidth(0.5);
  doc.line(40, y + 10, w - 40, y + 10);
}

function drawFooter(doc, page, total) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFont(FONT, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.faint);
  doc.text(`Bilan généré le ${todayLong()}`, 40, h - 24);
  doc.text(`${page} / ${total}`, w - 40, h - 24, { align: 'right' });
}

// Section heading: small uppercase tracked label + thin gold underscore.
function drawSection(doc, y, title) {
  doc.setFont(FONT, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.gold);
  doc.text(title.toUpperCase(), 40, y, { charSpace: 1.5 });
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.6);
  doc.line(40, y + 3, 40 + 16, y + 3);
}

// Big page title.
function drawTitle(doc, y, title, sub) {
  doc.setFont(FONT, 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.ink);
  doc.text(title, 40, y);
  if (sub) {
    doc.setFont(FONT, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.muted);
    doc.text(sub, 40, y + 16);
  }
}

// 2×2 KPI grid: label small + value large. Returns the y after drawing.
function drawKpiGrid(doc, y, kpis) {
  const w = doc.internal.pageSize.getWidth();
  const colW = (w - 80) / 2;
  const rowH = 56;

  kpis.forEach((kpi, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 40 + col * colW;
    const yy = y + row * rowH;

    // Soft separator
    doc.setDrawColor(...COLORS.rule);
    doc.setLineWidth(0.5);
    doc.line(x, yy, x + colW - 12, yy);

    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(kpi.label.toUpperCase(), x, yy + 14, { charSpace: 1.2 });

    doc.setFont(FONT, 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...(kpi.color || COLORS.ink));
    doc.text(kpi.value, x, yy + 38);

    if (kpi.hint) {
      doc.setFont(FONT, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.faint);
      doc.text(kpi.hint, x, yy + 50);
    }
  });

  const rows = Math.ceil(kpis.length / 2);
  return y + rows * rowH + 12;
}

// Wrapper around autoTable to apply a consistent sober look.
function table(doc, head, body, startY, opts = {}) {
  autoTable(doc, {
    startY,
    head,
    body,
    theme: 'plain',
    styles: {
      font: FONT,
      fontSize: 9,
      textColor: COLORS.ink,
      cellPadding: { top: 6, right: 8, bottom: 6, left: 0 },
      lineColor: COLORS.rule,
      lineWidth: 0,
    },
    headStyles: {
      fontSize: 7,
      fontStyle: 'bold',
      textColor: COLORS.muted,
      fillColor: false,
      lineWidth: { bottom: 0.6 },
      lineColor: COLORS.gold,
      cellPadding: { top: 4, right: 8, bottom: 4, left: 0 },
    },
    bodyStyles: {
      lineWidth: { bottom: 0.3 },
      lineColor: COLORS.rule,
    },
    alternateRowStyles: {},
    margin: { left: 40, right: 40 },
    ...opts,
  });
  return doc.lastAutoTable.finalY;
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

  // ----- PAGE 1 — Synthèse -----
  drawHeader(doc, headerSubtitle);
  let y = 90;
  drawTitle(doc, y, 'Bilan patrimonial', `Synthèse au ${todayLong()}${activeMember ? ` · ${activeMember.name}` : ''}`);
  y += 44;

  drawSection(doc, y, 'Indicateurs clés');
  y += 14;
  y = drawKpiGrid(doc, y, [
    { label: 'Patrimoine net', value: fmtEUR(netWorth), color: COLORS.ink, hint: 'liquidités + actifs − dettes' },
    {
      label: 'Performance 1 mois',
      value: perf1m == null ? '—' : `${perf1m >= 0 ? '+' : ''}${perf1m.toFixed(2)}%`,
      color: perf1m == null ? COLORS.muted : perf1m >= 0 ? COLORS.sage : COLORS.terracotta,
      hint: 'sur les liquidités',
    },
    { label: 'Liquidités', value: fmtEUR(liquidWealth), color: COLORS.ink, hint: `${visibleAccounts.length} compte${visibleAccounts.length > 1 ? 's' : ''}` },
    { label: 'Actifs', value: fmtEUR(assetsValue), color: COLORS.ink, hint: `${visibleAssets.length} ligne${visibleAssets.length > 1 ? 's' : ''}` },
    { label: 'Dettes', value: liabilitiesValue > 0 ? `−${fmtEUR(liabilitiesValue)}` : fmtEUR(0), color: liabilitiesValue > 0 ? COLORS.terracotta : COLORS.muted, hint: `${visibleLiabilities.length} prêt${visibleLiabilities.length > 1 ? 's' : ''}` },
    { label: 'Ratio dette / actifs', value: fmtPct(debtRatio), color: debtRatio == null ? COLORS.muted : debtRatio < 30 ? COLORS.sage : debtRatio < 50 ? [212, 165, 84] : COLORS.terracotta, hint: debtRatio == null ? '' : debtRatio < 30 ? 'sain' : debtRatio < 50 ? 'surveillé' : 'élevé' },
  ]);

  // Allocation table
  y += 8;
  drawSection(doc, y, 'Composition');
  y += 14;

  const allocClasses = {};
  if (liquidWealth > 0) allocClasses['Liquidités'] = liquidWealth;
  visibleAssets.forEach((a) => {
    const cls = (ASSET_CLASS_MAP && ASSET_CLASS_MAP[a.type]?.class) || 'Divers';
    const val = (parseFloat(a.currentValue) || 0) * memberShare(a);
    allocClasses[cls] = (allocClasses[cls] || 0) + val;
  });
  const allocTotal = Object.values(allocClasses).reduce((s, v) => s + v, 0);
  const allocRows = Object.entries(allocClasses)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, val]) => [name, fmtEUR(val), allocTotal > 0 ? `${((val / allocTotal) * 100).toFixed(1)} %` : '—']);
  if (allocRows.length === 0) allocRows.push(['—', '—', '—']);

  y = table(
    doc,
    [['Classe', 'Montant', 'Part']],
    allocRows,
    y,
    { columnStyles: { 1: { halign: 'right', font: FONT, fontStyle: 'bold' }, 2: { halign: 'right', textColor: COLORS.muted } } }
  );

  drawFooter(doc, 1, 3);

  // ----- PAGE 2 — Trésorerie du mois -----
  doc.addPage();
  drawHeader(doc, headerSubtitle);
  y = 90;
  drawTitle(doc, y, 'Trésorerie', monthLong(currentMonth));
  y += 44;

  drawSection(doc, y, 'Cashflow du mois');
  y += 14;
  const savingsRate = thisMonthStats?.income > 0 ? (thisMonthStats.net / thisMonthStats.income) * 100 : null;
  y = drawKpiGrid(doc, y, [
    { label: 'Revenus', value: fmtEUR(thisMonthStats?.income || 0), color: COLORS.sage },
    { label: 'Dépenses', value: fmtEUR(thisMonthStats?.expenses || 0), color: COLORS.terracotta },
    { label: 'Épargne nette', value: fmtEUR(thisMonthStats?.net || 0), color: (thisMonthStats?.net || 0) >= 0 ? COLORS.sage : COLORS.terracotta },
    { label: 'Taux d\'épargne', value: fmtPct(savingsRate, 0), color: savingsRate == null ? COLORS.muted : savingsRate >= 20 ? COLORS.sage : savingsRate >= 10 ? [212, 165, 84] : COLORS.terracotta, hint: 'sur revenus du mois' },
  ]);

  // Top 5 dépenses du mois
  y += 8;
  drawSection(doc, y, 'Top 5 dépenses du mois');
  y += 14;
  const topCats = Object.entries(categoryAnalysis || {})
    .filter(([, d]) => d.current > 0)
    .map(([catId, data]) => {
      const cat = categories.find((c) => c.id === catId);
      const change = data.avg3m > 0 ? ((data.current - data.avg3m) / data.avg3m) * 100 : 0;
      return { name: cat?.name || catId, current: data.current, avg: data.avg3m, change };
    })
    .sort((a, b) => b.current - a.current)
    .slice(0, 5);
  const topRows = topCats.length === 0
    ? [['—', '—', '—', '—']]
    : topCats.map((c) => [
        c.name,
        fmtEUR(c.current),
        fmtEUR(c.avg),
        Math.abs(c.change) > 5 ? `${c.change > 0 ? '+' : ''}${c.change.toFixed(0)} %` : '—',
      ]);
  y = table(
    doc,
    [['Catégorie', 'Ce mois', 'Moy. 3 mois', 'Δ']],
    topRows,
    y,
    {
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold' },
        2: { halign: 'right', textColor: COLORS.muted },
        3: { halign: 'right', textColor: COLORS.muted },
      },
    }
  );

  // Charges fixes récurrentes
  y += 8;
  drawSection(doc, y, 'Charges fixes récurrentes');
  y += 14;
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
  y = table(
    doc,
    [['Jour', 'Libellé', 'Compte', 'Montant']],
    recurringRows,
    y,
    {
      columnStyles: {
        0: { textColor: COLORS.muted, cellWidth: 50 },
        3: { halign: 'right', fontStyle: 'bold' },
      },
    }
  );

  drawFooter(doc, 2, 3);

  // ----- PAGE 3 — Détails -----
  doc.addPage();
  drawHeader(doc, headerSubtitle);
  y = 90;
  drawTitle(doc, y, 'Détail', 'Comptes, actifs et dettes');
  y += 44;

  // Comptes
  drawSection(doc, y, 'Comptes');
  y += 14;
  const accRows = visibleAccounts.length === 0
    ? [['—', '—', '—']]
    : visibleAccounts.map((a) => {
        const bal = (accountBalances?.[a.id] || 0) * memberShare(a);
        return [a.name, a.bank || '—', fmtEUR(bal)];
      });
  y = table(
    doc,
    [['Compte', 'Banque', 'Solde']],
    accRows,
    y,
    { columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } } }
  );

  // Actifs
  if (y > doc.internal.pageSize.getHeight() - 200) {
    drawFooter(doc, 3, 3);
    doc.addPage();
    drawHeader(doc, headerSubtitle);
    y = 90;
  }
  y += 8;
  drawSection(doc, y, 'Actifs');
  y += 14;
  const assetRows = visibleAssets.length === 0
    ? [['—', '—', '—']]
    : visibleAssets.map((a) => [
        a.name || '—',
        (ASSET_CLASS_MAP && ASSET_CLASS_MAP[a.type]?.class) || a.type || 'Divers',
        fmtEUR((parseFloat(a.currentValue) || 0) * memberShare(a)),
      ]);
  y = table(
    doc,
    [['Libellé', 'Classe', 'Valeur']],
    assetRows,
    y,
    { columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } } }
  );

  // Dettes
  if (visibleLiabilities.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 160) {
      drawFooter(doc, 3, 3);
      doc.addPage();
      drawHeader(doc, headerSubtitle);
      y = 90;
    }
    y += 8;
    drawSection(doc, y, 'Dettes');
    y += 14;
    const liaRows = visibleLiabilities.map((l) => [
      l.name || '—',
      l.type || '—',
      fmtEUR((parseFloat(l.remainingAmount ?? l.amount) || 0) * memberShare(l)),
    ]);
    y = table(
      doc,
      [['Libellé', 'Type', 'Restant dû']],
      liaRows,
      y,
      { columnStyles: { 2: { halign: 'right', fontStyle: 'bold', textColor: COLORS.terracotta } } }
    );
  }

  drawFooter(doc, doc.internal.getNumberOfPages(), doc.internal.getNumberOfPages());

  // Save with a name like "wealthly-bilan-2026-05.pdf"
  const monthSuffix = currentMonth || new Date().toISOString().slice(0, 7);
  const memberSlug = activeMember ? `-${activeMember.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}` : '';
  doc.save(`wealthly-bilan${memberSlug}-${monthSuffix}.pdf`);
}
