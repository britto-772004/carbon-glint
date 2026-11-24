/* eslint-disable react-refresh/only-export-components */
import { Document, Font, Page, Path, Rect, StyleSheet, Svg, Text, View, pdf } from '@react-pdf/renderer';
import type { DisclosureRow, ReportFormatDef } from './formats';
import type { ReportData } from './report-data';

import livvic400 from '@fontsource/livvic/files/livvic-latin-400-normal.woff?url';
import livvic600 from '@fontsource/livvic/files/livvic-latin-600-normal.woff?url';
import livvic700 from '@fontsource/livvic/files/livvic-latin-700-normal.woff?url';
Font.register({
  family: 'Livvic',
  fonts: [{ src: livvic400 }, { src: livvic600, fontWeight: 600 }, { src: livvic700, fontWeight: 700 }],
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
  zebra: '#f7faf9',
};
const SCOPE = { '1': C.amber, '2': C.brand, '3': C.leaf };

const W = 507; // A4 content width (595pt − 2 × 44pt margins)

const s = StyleSheet.create({
  page: {
    fontFamily: 'Livvic',
    fontSize: 9.5,
    color: C.ink,
    paddingTop: 52,
    paddingBottom: 54,
    paddingHorizontal: 44,
    lineHeight: 1.4,
  },
  header: {
    position: 'absolute',
    top: 20,
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderColor: C.line,
    fontSize: 7.5,
    color: C.muted,
  },
  h1: { fontSize: 20, fontWeight: 700, color: C.dark, lineHeight: 1.25 },
  section: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  sectionBar: { width: 4, height: 13, borderRadius: 2, backgroundColor: C.brand, marginRight: 7 },
  h2: { fontSize: 12.5, fontWeight: 700, color: C.dark },
  muted: { color: C.muted },
  row: { flexDirection: 'row' },
  kpi: { flex: 1, padding: 10, backgroundColor: C.soft, borderRadius: 6, borderTopWidth: 3 },
  kpiLabel: { fontSize: 8, color: C.muted },
  kpiValue: { fontSize: 14, fontWeight: 700, marginTop: 2, marginBottom: 1 },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: 6, overflow: 'hidden' },
  thRow: { flexDirection: 'row', backgroundColor: C.soft, paddingVertical: 5, paddingHorizontal: 6 },
  tr: { flexDirection: 'row', paddingVertical: 4.5, paddingHorizontal: 6, borderTopWidth: 1, borderColor: C.line },
  th: { fontWeight: 700, color: C.muted, fontSize: 8 },
  footer: {
    position: 'absolute',
    bottom: 22,
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

function PageChrome({ d }: { d: ReportData }) {
  return (
    <>
      <View style={s.header} fixed>
        <Text style={{ fontWeight: 700, color: C.brand }}>Carbon Glint</Text>
        <Text>GHG Emissions Report · {d.companyName}</Text>
      </View>
      <View style={s.footer} fixed>
        <Text>
          {d.orgUnitName} · {d.periodStart} – {d.periodEnd} · Prepared with Carbon Glint; not assured.
        </Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </>
  );
}

function Section({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <View minPresenceAhead={120}>
      <View style={s.section} wrap={false}>
        <View style={s.sectionBar} />
        <Text style={s.h2}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

/** Zebra table. `right` lists the (numeric) columns that are right-aligned. */
function Table({
  cols,
  rows,
  widths,
  right,
}: {
  cols: string[];
  rows: string[][];
  widths: number[];
  right?: number[];
}) {
  const alignRight = right ?? [cols.length - 1];
  const cell = (i: number) => ({
    width: `${widths[i]}%`,
    textAlign: alignRight.includes(i) ? ('right' as const) : ('left' as const),
    paddingRight: 6,
  });
  return (
    <View style={s.table}>
      <View style={s.thRow} fixed>
        {cols.map((c, i) => (
          <Text key={c} style={[s.th, cell(i)]}>
            {c}
          </Text>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={ri} style={[s.tr, { backgroundColor: ri % 2 ? C.zebra : 'white' }]} wrap={false}>
          {r.map((c, i) => (
            <Text key={i} style={cell(i)}>
              {c}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function Legend() {
  return (
    <View style={[s.row, { marginTop: 6 }]}>
      {(
        [
          ['Scope 1', C.amber],
          ['Scope 2', C.brand],
          ['Scope 3', C.leaf],
        ] as const
      ).map(([label, color]) => (
        <View key={label} style={[s.row, { alignItems: 'center', marginRight: 14 }]}>
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color, marginRight: 4 }} />
          <Text style={s.muted}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Horizontal 100% bar of the scope split. */
function ScopeBar({ d }: { d: ReportData }) {
  let x = 0;
  return (
    <Svg width={W} height={16}>
      {(['1', '2', '3'] as const).map((k) => {
        const w = d.totals.total ? (d.totals[k] / d.totals.total) * W : 0;
        const r = <Rect key={k} x={x} y={0} width={w} height={16} fill={SCOPE[k]} />;
        x += w;
        return r;
      })}
    </Svg>
  );
}

/** Monthly stacked columns by scope, evenly spread across the full width. */
function MonthlyChart({ d }: { d: ReportData }) {
  const H = 120;
  const months = d.byMonth.slice(-24);
  const max = Math.max(1, ...months.map((m) => m.s1 + m.s2 + m.s3));
  const slot = months.length ? W / months.length : W;
  const bw = Math.min(30, slot * 0.68);
  const tick = months.length > 12 ? 2 : 1;
  return (
    <View>
      <Svg width={W} height={H}>
        {[0.25, 0.5, 0.75].map((f) => (
          <Path key={f} d={`M0 ${H - f * (H - 10)} L${W} ${H - f * (H - 10)}`} stroke={C.line} strokeWidth={0.5} />
        ))}
        <Path d={`M0 ${H - 0.5} L${W} ${H - 0.5}`} stroke={C.muted} strokeWidth={0.8} />
        {months.flatMap((m, i) => {
          const x = i * slot + (slot - bw) / 2;
          let y = H - 1;
          return (['s1', 's2', 's3'] as const).map((k, j) => {
            const h = (m[k] / max) * (H - 10);
            y -= h;
            return <Rect key={`${i}-${k}`} x={x} y={y} width={bw} height={h} fill={[C.amber, C.brand, C.leaf][j]} />;
          });
        })}
      </Svg>
      <View style={{ flexDirection: 'row', marginTop: 3 }}>
        {months.map((m, i) => (
          <Text key={m.month} style={{ width: slot, textAlign: 'center', fontSize: 6.5, color: C.muted }}>
            {i % tick === 0 ? m.month.slice(2) : ''}
          </Text>
        ))}
      </View>
      <Legend />
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '50%', marginBottom: 14, paddingRight: 12 }}>
      <Text style={{ fontSize: 8, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</Text>
      <Text style={{ fontSize: 11.5, fontWeight: 600, marginTop: 2 }}>{value}</Text>
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
  const half = Math.ceil(d.boundary.length / 2);
  const kpis: Array<[string, number, string]> = [
    ['Total', T.total, C.dark],
    ['Scope 1', T['1'], C.amber],
    ['Scope 2', T['2'], C.brand],
    ['Scope 3', T['3'], C.leaf],
  ];
  return (
    <Document title={`${format.name} — ${d.companyName}`} author="Carbon Glint" subject="GHG emissions report">
      {/* Cover: a solid brand block, then the key facts — the page is filled top to bottom. */}
      <Page size="A4" style={{ fontFamily: 'Livvic', padding: 0 }}>
        <View style={{ backgroundColor: C.brand, height: '52%', padding: 54, justifyContent: 'space-between' }}>
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>Carbon Glint</Text>
          <View>
            <Text style={{ color: '#ccfbf1', fontSize: 11, marginBottom: 8 }}>
              {format.region} · {format.framework}
            </Text>
            <Text style={{ color: 'white', fontSize: 32, fontWeight: 700, lineHeight: 1.15 }}>
              GHG Emissions Report
            </Text>
            <Text style={{ color: 'white', fontSize: 17, marginTop: 10 }}>{d.companyName}</Text>
          </View>
        </View>
        <View style={{ height: '48%', paddingHorizontal: 54, paddingTop: 34, paddingBottom: 40 }}>
          <View style={[s.row, { flexWrap: 'wrap' }]}>
            <Meta label="Business unit" value={d.orgUnitName} />
            <Meta label="Reporting period" value={`${d.periodStart} to ${d.periodEnd}`} />
            <Meta label="Format" value={format.name} />
            <Meta label="Generated" value={new Date(d.generatedAt).toUTCString().slice(5, 22)} />
          </View>
          <View style={{ borderTopWidth: 1, borderColor: C.line, paddingTop: 16, marginTop: 2 }}>
            <Text style={{ fontSize: 28, fontWeight: 700, color: C.dark }}>{tco2e(T.total)}</Text>
            <Text style={s.muted}>total gross emissions (Scope 1 + 2 + 3)</Text>
          </View>
          <View style={[s.row, { marginTop: 18 }]}>
            {(
              [
                ['Scope 1', T['1'], C.amber],
                ['Scope 2', T['2'], C.brand],
                ['Scope 3', T['3'], C.leaf],
              ] as const
            ).map(([label, v, color], i) => (
              <View key={label} style={[s.kpi, { borderTopColor: color, marginRight: i < 2 ? 8 : 0 }]}>
                <Text style={s.kpiLabel}>{label}</Text>
                <Text style={s.kpiValue}>{tco2e(v)}</Text>
                <Text style={s.kpiLabel}>{pct(v, T.total)} of total</Text>
              </View>
            ))}
          </View>
          <Text style={{ position: 'absolute', left: 54, right: 54, bottom: 40, fontSize: 8, color: C.muted }}>
            This report follows the published framework structure but has not been reviewed or assured by a third party.
            It must be reviewed by an ESG / compliance professional before filing.
          </Text>
        </View>
      </Page>

      {/* All content flows through one page so there are no part-empty pages. */}
      <Page size="A4" style={s.page} wrap>
        <PageChrome d={d} />
        <Text style={s.h1}>Executive summary</Text>
        <View style={[s.row, { marginTop: 10 }]}>
          {kpis.map(([label, v, color], i) => (
            <View key={label} style={[s.kpi, { borderTopColor: color, marginRight: i < 3 ? 8 : 0 }]}>
              <Text style={s.kpiLabel}>{label}</Text>
              <Text style={s.kpiValue}>{tco2e(v)}</Text>
              <Text style={s.kpiLabel}>{i === 0 ? `${d.quality.activities} activities` : pct(v, T.total)}</Text>
            </View>
          ))}
        </View>

        <Section title="Scope split">
          <ScopeBar d={d} />
          <Text style={[s.muted, { marginTop: 4 }]}>
            Scope 1 {pct(T['1'], T.total)} · Scope 2 {pct(T['2'], T.total)} · Scope 3 {pct(T['3'], T.total)} · Energy
            consumed {d.energyGj.toLocaleString('en', { maximumFractionDigits: 1 })} GJ
          </Text>
        </Section>

        <Section title="Emissions over time">
          <MonthlyChart d={d} />
        </Section>

        <View style={[s.row, { alignItems: 'flex-start' }]} wrap={false}>
          <View style={{ width: '46%', marginRight: '4%' }}>
            <Section title="Organisational boundary">
              <Text style={[s.muted, { marginBottom: 4 }]}>Operational control. Business units included:</Text>
              {d.boundary.slice(0, Math.max(half, 8)).map((b, i) => (
                <Text key={i} style={{ marginLeft: b.depth * 10 }}>
                  {b.depth ? '└ ' : ''}
                  {b.name}
                </Text>
              ))}
              {d.boundary.length > Math.max(half, 8) && (
                <Text style={s.muted}>+ {d.boundary.length - Math.max(half, 8)} more</Text>
              )}
            </Section>
          </View>
          <View style={{ width: '50%' }}>
            <Section title="Methodology">
              <Text>
                Emissions are calculated per activity as quantity × unit conversion × emission factor, following the GHG
                Protocol Corporate Standard. Factors come from published databases held locally and are matched by
                full-text search with AI-assisted selection among real candidates; the AI never produces numeric values.
                Scope 2 is location-based. CO2e uses each source&apos;s GWP basis. Activities spanning several months
                are allocated by days.
              </Text>
            </Section>
          </View>
        </View>

        <Section title={format.framework}>
          <Text style={[s.muted, { marginBottom: 6 }]}>{format.description}</Text>
          <Table
            cols={['Reference', 'Disclosure', 'Value']}
            widths={[22, 50, 28]}
            rows={disclosures.map((r) => [r.ref, r.item, r.value])}
          />
          {format.notes.map((n, i) => (
            <Text key={i} style={[s.muted, { marginTop: 5 }]}>
              Note: {n}
            </Text>
          ))}
        </Section>

        <Section title="Emissions by GHG category">
          <Table
            cols={['Scope', 'Category', 'Share', 'Emissions']}
            widths={[12, 52, 12, 24]}
            right={[2, 3]}
            rows={d.byCategory.map((c) => [`Scope ${c.scope}`, c.name, pct(c.co2eKg, T.total), tco2e(c.co2eKg)])}
          />
        </Section>

        <Section title="Emissions by business unit">
          <Table
            cols={['Business unit', 'Share', 'Emissions']}
            widths={[58, 16, 26]}
            right={[1, 2]}
            rows={d.byOrgUnit.map((u) => [u.name, pct(u.co2eKg, T.total), tco2e(u.co2eKg)])}
          />
        </Section>

        <View style={[s.row, { alignItems: 'flex-start' }]} wrap={false}>
          <View style={{ width: '48%', marginRight: '4%' }}>
            <Section title="Emission factor sources">
              <Table
                cols={['Source', 'Activities']}
                widths={[65, 35]}
                rows={d.sources.map((x) => [x.code, String(x.count)])}
              />
            </Section>
          </View>
          <View style={{ width: '48%' }}>
            <Section title="Data quality">
              <Table
                cols={['Measure', 'Count']}
                widths={[78, 22]}
                rows={[
                  ['Activities in scope', String(d.quality.activities)],
                  ['Matched with AI assistance', String(d.quality.aiMatched)],
                  ['Flagged for review', String(d.quality.needsReview)],
                  ['Without a matching factor', String(d.quality.unmatched)],
                  ['Manually overridden', String(d.quality.overridden)],
                ]}
              />
            </Section>
          </View>
        </View>

        {d.overrides.length > 0 && (
          <Section title="Manual overrides">
            <Table
              cols={['Activity', 'Emissions']}
              widths={[74, 26]}
              rows={d.overrides.slice(0, 40).map((o) => [o.description, tco2e(o.co2eKg)])}
            />
          </Section>
        )}

        <Section title="Appendix — traceability summary (top activities)">
          <Table
            cols={['Activity', 'Business unit', 'Quantity', 'Factor', 'Emissions']}
            widths={[28, 16, 17, 23, 16]}
            right={[2, 4]}
            rows={d.topActivities.map((a) => [a.description, a.orgUnit, a.measure, a.factor, tco2e(a.co2eKg)])}
          />
          <Text style={[s.muted, { marginTop: 6 }]}>
            The full per-activity trace (input row, conversion, factor and overrides) is available in Carbon Glint.
          </Text>
        </Section>
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

export const renderReportPdf = (raw: ReportData, format: ReportFormatDef): Promise<Blob> => {
  const d = sanitize(raw);
  return pdf(<ReportDocument d={d} format={format} disclosures={sanitize(format.disclosures(d))} />).toBlob();
};
