import { fileURLToPath } from 'node:url';
import { Document, Font, Page, Path, Rect, StyleSheet, Svg, Text, View, renderToBuffer } from '@react-pdf/renderer';
import type { DisclosureRow, ReportFormatDef } from './formats.js';
import type { ReportData } from './report-data.js';

const font = (w: number) =>
  fileURLToPath(import.meta.resolve(`@fontsource/livvic/files/livvic-latin-${w}-normal.woff`));
Font.register({
  family: 'Livvic',
  fonts: [{ src: font(400) }, { src: font(600), fontWeight: 600 }, { src: font(700), fontWeight: 700 }],
});
Font.registerHyphenationCallback((w) => [w]);

const C = {
  brand: '#0f766e',
  dark: '#134e4a',
  leaf: '#65a30d',
  amber: '#d97706',
  ink: '#10201c',
  muted: '#5b6b66',
  line: '#dfe7e4',
  soft: '#f0f5f3',
};
const SCOPE = { '1': C.amber, '2': C.brand, '3': C.leaf };

const s = StyleSheet.create({
  page: {
    fontFamily: 'Livvic',
    fontSize: 9.5,
    color: C.ink,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 44,
    lineHeight: 1.4,
  },
  h1: { fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 8, lineHeight: 1.25 },
  h2: { fontSize: 13, fontWeight: 700, color: C.brand, marginTop: 14, marginBottom: 6 },
  muted: { color: C.muted },
  row: { flexDirection: 'row' },
  kpi: { flex: 1, padding: 10, marginRight: 8, backgroundColor: C.soft, borderRadius: 6, borderTopWidth: 3 },
  kpiLabel: { fontSize: 8, color: C.muted },
  kpiValue: { fontSize: 14, fontWeight: 700, marginTop: 2 },
  table: { borderTopWidth: 1, borderColor: C.line, marginTop: 4 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderColor: C.line, paddingVertical: 4 },
  th: { fontWeight: 700, color: C.muted, fontSize: 8 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: C.muted,
  },
});

const tco2e = (kg: number) => `${(kg / 1000).toLocaleString('en', { maximumFractionDigits: 2 })} tCO2e`;
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '—');

function Footer({ d }: { d: ReportData }) {
  return (
    <View style={s.footer} fixed>
      <Text>
        {d.companyName} · {d.orgUnitName} · {d.periodStart} – {d.periodEnd} · Prepared with Carbon Glint; not assured.
      </Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function Table({ cols, rows, widths }: { cols: string[]; rows: string[][]; widths: number[] }) {
  return (
    <View style={s.table}>
      <View style={s.tr} fixed>
        {cols.map((c, i) => (
          <Text key={c} style={[s.th, { width: `${widths[i]}%`, textAlign: i === cols.length - 1 ? 'right' : 'left' }]}>
            {c}
          </Text>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={ri} style={s.tr} wrap={false}>
          {r.map((c, i) => (
            <Text
              key={i}
              style={{ width: `${widths[i]}%`, textAlign: i === r.length - 1 ? 'right' : 'left', paddingRight: 4 }}
            >
              {c}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Horizontal 100% bar of the scope split. */
function ScopeBar({ d }: { d: ReportData }) {
  const W = 507;
  let x = 0;
  return (
    <Svg width={W} height={18}>
      {(['1', '2', '3'] as const).map((k) => {
        const w = d.totals.total ? (d.totals[k] / d.totals.total) * W : 0;
        const r = <Rect key={k} x={x} y={0} width={w} height={18} fill={SCOPE[k]} />;
        x += w;
        return r;
      })}
    </Svg>
  );
}

/** Monthly stacked columns by scope. */
function MonthlyChart({ d }: { d: ReportData }) {
  const W = 507;
  const H = 130;
  const months = d.byMonth.slice(-24);
  const max = Math.max(1, ...months.map((m) => m.s1 + m.s2 + m.s3));
  const bw = months.length ? Math.min(28, (W - 10) / months.length - 4) : 0;
  return (
    <View>
      <Svg width={W} height={H}>
        <Path d={`M0 ${H - 0.5} L${W} ${H - 0.5}`} stroke={C.line} strokeWidth={1} />
        {months.flatMap((m, i) => {
          const x = 4 + i * (bw + 4);
          let y = H - 1;
          return (['s1', 's2', 's3'] as const).map((k, j) => {
            const h = (m[k] / max) * (H - 10);
            y -= h;
            return <Rect key={`${i}-${k}`} x={x} y={y} width={bw} height={h} fill={[C.amber, C.brand, C.leaf][j]} />;
          });
        })}
      </Svg>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Text style={s.muted}>{months[0]?.month ?? ''}</Text>
        <Text style={s.muted}>{months.at(-1)?.month ?? ''}</Text>
      </View>
    </View>
  );
}

export function ReportDocument({
  d,
  format,
  disclosures,
}: {
  d: ReportData;
  format: ReportFormatDef;
  disclosures: DisclosureRow[];
}) {
  const T = d.totals;
  return (
    <Document title={`${format.name} — ${d.companyName}`} author="Carbon Glint" subject="GHG emissions report">
      {/* Cover */}
      <Page size="A4" style={{ fontFamily: 'Livvic', padding: 0 }}>
        <View style={{ backgroundColor: C.brand, height: '58%', padding: 54, justifyContent: 'space-between' }}>
          <Text style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>Carbon Glint</Text>
          <View>
            <Text style={{ color: '#ccfbf1', fontSize: 11, marginBottom: 8 }}>
              {format.region} · {format.framework}
            </Text>
            <Text style={{ color: 'white', fontSize: 30, fontWeight: 700, lineHeight: 1.15 }}>
              GHG Emissions Report
            </Text>
            <Text style={{ color: 'white', fontSize: 16, marginTop: 10 }}>{d.companyName}</Text>
          </View>
        </View>
        <View style={{ padding: 54 }}>
          <Text style={{ fontSize: 12, fontWeight: 600 }}>{d.orgUnitName}</Text>
          <Text style={[s.muted, { marginTop: 4 }]}>
            Reporting period: {d.periodStart} to {d.periodEnd}
          </Text>
          <Text style={[s.muted, { marginTop: 2 }]}>Format: {format.name}</Text>
          <Text style={[s.muted, { marginTop: 2 }]}>Generated: {new Date(d.generatedAt).toUTCString()}</Text>
          <Text style={{ fontSize: 26, fontWeight: 700, color: C.dark, marginTop: 30 }}>{tco2e(T.total)}</Text>
          <Text style={s.muted}>total gross emissions (Scope 1 + 2 + 3)</Text>
          <Text style={{ marginTop: 40, fontSize: 8, color: C.muted }}>
            This report follows the published framework structure but has not been reviewed or assured by a third party.
            It must be reviewed by an ESG / compliance professional before filing.
          </Text>
        </View>
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Executive summary</Text>
        <View style={[s.row, { marginTop: 6 }]}>
          {[
            ['Total', T.total, C.dark],
            ['Scope 1', T['1'], C.amber],
            ['Scope 2', T['2'], C.brand],
            ['Scope 3', T['3'], C.leaf],
          ].map(([label, v, color]) => (
            <View key={label as string} style={[s.kpi, { borderTopColor: color as string }]}>
              <Text style={s.kpiLabel}>{label as string}</Text>
              <Text style={s.kpiValue}>{tco2e(v as number)}</Text>
              <Text style={s.kpiLabel}>
                {label === 'Total' ? `${d.quality.activities} activities` : pct(v as number, T.total)}
              </Text>
            </View>
          ))}
        </View>
        <Text style={s.h2}>Scope split</Text>
        <ScopeBar d={d} />
        <Text style={[s.muted, { marginTop: 3 }]}>
          Scope 1 {pct(T['1'], T.total)} · Scope 2 {pct(T['2'], T.total)} · Scope 3 {pct(T['3'], T.total)} · Energy
          consumed {d.energyGj.toLocaleString('en', { maximumFractionDigits: 1 })} GJ
        </Text>
        <Text style={s.h2}>Emissions over time</Text>
        <MonthlyChart d={d} />

        <Text style={s.h2}>Organisational boundary</Text>
        <Text style={s.muted}>Operational control approach. Business units included in this report:</Text>
        {d.boundary.map((b, i) => (
          <Text key={i} style={{ marginLeft: b.depth * 12 }}>
            {b.depth ? '└ ' : ''}
            {b.name}
          </Text>
        ))}

        <Text style={s.h2}>Methodology</Text>
        <Text>
          Emissions are calculated per activity as quantity × unit conversion × emission factor, following the GHG
          Protocol Corporate Standard. Factors come from published databases held locally (listed below) and are matched
          by full-text search with AI-assisted selection among real candidate factors; the AI never produces numeric
          values. Scope 2 is location-based. CO2e uses the GWP basis published by each factor source. Activities
          spanning several months are allocated by days.
        </Text>
        <Footer d={d} />
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.h1}>{format.framework}</Text>
        <Text style={[s.muted, { marginBottom: 6 }]}>{format.description}</Text>
        <Table
          cols={['Reference', 'Disclosure', 'Value']}
          widths={[22, 52, 26]}
          rows={disclosures.map((r) => [r.ref, r.item, r.value])}
        />
        {format.notes.map((n, i) => (
          <Text key={i} style={[s.muted, { marginTop: 6 }]}>
            Note: {n}
          </Text>
        ))}

        <Text style={s.h2}>Emissions by GHG category</Text>
        <Table
          cols={['Scope', 'Category', 'Emissions']}
          widths={[12, 62, 26]}
          rows={d.byCategory.map((c) => [`Scope ${c.scope}`, c.name, tco2e(c.co2eKg)])}
        />

        <Text style={s.h2}>Emissions by business unit</Text>
        <Table
          cols={['Business unit', 'Share', 'Emissions']}
          widths={[58, 16, 26]}
          rows={d.byOrgUnit.map((u) => [u.name, pct(u.co2eKg, T.total), tco2e(u.co2eKg)])}
        />
        <Footer d={d} />
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Data sources & quality</Text>
        <Text style={s.h2}>Emission factor sources</Text>
        <Table
          cols={['Source', 'Activities using it']}
          widths={[70, 30]}
          rows={d.sources.map((x) => [x.code, String(x.count)])}
        />
        <Text style={s.h2}>Data quality</Text>
        <Table
          cols={['Measure', 'Value']}
          widths={[70, 30]}
          rows={[
            ['Activities in scope', String(d.quality.activities)],
            ['Matched with AI assistance', String(d.quality.aiMatched)],
            ['Flagged for review (low match confidence)', String(d.quality.needsReview)],
            ['Without a matching factor (0 counted)', String(d.quality.unmatched)],
            ['Manually overridden (reason recorded)', String(d.quality.overridden)],
          ]}
        />
        {d.overrides.length > 0 && (
          <>
            <Text style={s.h2}>Manual overrides</Text>
            <Table
              cols={['Activity', 'Emissions']}
              widths={[74, 26]}
              rows={d.overrides.slice(0, 40).map((o) => [o.description, tco2e(o.co2eKg)])}
            />
          </>
        )}
        <Text style={s.h2}>Appendix — traceability summary (top activities)</Text>
        <Table
          cols={['Activity', 'Business unit', 'Quantity', 'Factor', 'Emissions']}
          widths={[30, 16, 16, 22, 16]}
          rows={d.topActivities.map((a) => [a.description, a.orgUnit, a.measure, a.factor, tco2e(a.co2eKg)])}
        />
        <Text style={[s.muted, { marginTop: 8 }]}>
          The full per-activity trace (input row, conversion, factor and overrides) is available in Carbon Glint.
        </Text>
        <Footer d={d} />
      </Page>
    </Document>
  );
}

/** Livvic (latin subset) lacks some symbols; map them to safe equivalents. */
const GLYPHS: Record<string, string> = {
  '→': '->',
  '←': '<-',
  '₂': '2',
  '₄': '4',
  '≥': '>=',
  '≤': '<=',
  '×': 'x',
  '✓': 'v',
};
export const pdfSafe = (v: string) => v.replace(/[→←₂₄≥≤×✓]/g, (c) => GLYPHS[c] ?? c);
const sanitize = <T,>(value: T): T =>
  typeof value === 'string'
    ? (pdfSafe(value) as T)
    : Array.isArray(value)
      ? (value.map(sanitize) as T)
      : value && typeof value === 'object'
        ? (Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitize(v)])) as T)
        : value;

export const renderReportPdf = (raw: ReportData, format: ReportFormatDef): Promise<Buffer> => {
  const d = sanitize(raw);
  return renderToBuffer(<ReportDocument d={d} format={format} disclosures={sanitize(format.disclosures(d))} />);
};
