/**
 * Generates docs/local-testing-guide.pdf — how to run and test Carbon Glint locally.
 *   pnpm --filter @carbon-glint/api exec tsx scripts/local-testing-guide.tsx
 */
import { fileURLToPath } from 'node:url';
import { Document, Font, Page, StyleSheet, Text, View, renderToFile } from '@react-pdf/renderer';
import React, { type ReactNode } from 'react';

void React; // classic JSX runtime when run directly with tsx

const font = (w: number) =>
  fileURLToPath(import.meta.resolve(`@fontsource/livvic/files/livvic-latin-${w}-normal.woff`));
Font.register({
  family: 'Livvic',
  fonts: [{ src: font(400) }, { src: font(600), fontWeight: 600 }, { src: font(700), fontWeight: 700 }],
});
Font.registerHyphenationCallback((w) => [w]);

const C = { brand: '#0f766e', dark: '#134e4a', ink: '#1f2a28', muted: '#5b6b66', line: '#d9e3df', code: '#f3f6f5' };

const s = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    fontFamily: 'Livvic',
    fontSize: 10,
    color: C.ink,
    paddingTop: 42,
    paddingBottom: 50,
    paddingHorizontal: 50,
    lineHeight: 1.45,
  },
  h1: { fontSize: 22, fontWeight: 700, color: C.dark, marginBottom: 8, lineHeight: 1.25 },
  h2: { fontSize: 13.5, fontWeight: 700, color: C.brand, marginTop: 12, marginBottom: 5 },
  h3: { fontSize: 11, fontWeight: 700, marginTop: 10, marginBottom: 3 },
  p: { marginBottom: 5 },
  muted: { color: C.muted },
  code: { fontFamily: 'Courier', fontSize: 9, backgroundColor: C.code, padding: 8, borderRadius: 4, marginVertical: 5 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: C.line, paddingVertical: 5 },
  footer: {
    position: 'absolute',
    bottom: 26,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: C.muted,
  },
});

const Code = ({ children }: { children: string }) => <Text style={s.code}>{children}</Text>;
const P = ({ children }: { children: ReactNode }) => <Text style={s.p}>{children}</Text>;
const B = ({ children }: { children: ReactNode }) => <Text style={{ fontWeight: 700 }}>{children}</Text>;

/** A test step: checkbox, action, expected result. */
function Check({ action, expect }: { action: string; expect: string }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 4.5 }} wrap={false}>
      <View
        style={{
          width: 10,
          height: 10,
          borderWidth: 1,
          borderColor: C.brand,
          borderRadius: 2,
          marginTop: 2,
          marginRight: 8,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text>{action}</Text>
        <Text style={s.muted}>Expected: {expect}</Text>
      </View>
    </View>
  );
}

function Table({ rows, widths }: { rows: string[][]; widths: number[] }) {
  return (
    <View style={{ borderTopWidth: 1, borderColor: C.line, marginVertical: 4 }}>
      {rows.map((r, i) => (
        <View key={i} style={s.row} wrap={false}>
          {r.map((c, j) => (
            <Text
              key={j}
              style={{
                width: `${widths[j]}%`,
                fontWeight: i === 0 ? 700 : 400,
                color: i === 0 ? C.muted : C.ink,
                fontSize: i === 0 ? 8.5 : 10,
                paddingRight: 6,
              }}
            >
              {c}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const Footer = () => (
  <View style={s.footer} fixed>
    <Text>Carbon Glint · Local testing guide</Text>
    <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
  </View>
);

function Guide() {
  return (
    <Document title="Carbon Glint — Local testing guide" author="Carbon Glint">
      <Page size="A4" style={s.page}>
        <Text style={{ fontSize: 11, fontWeight: 700, color: C.brand, marginBottom: 28 }}>Carbon Glint</Text>
        <Text style={s.h1}>Local testing guide</Text>
        <Text style={[s.muted, { fontSize: 11, marginBottom: 18 }]}>
          Run the whole platform on your machine with one command, then walk through every feature end to end.
        </Text>

        <Text style={s.h2}>1. What you need</Text>
        <P>• Docker Desktop (or OrbStack) running, with about 3 GB of free disk space.</P>
        <P>• The repository checked out, e.g. /Users/home/carbon-glint/carbon-glint.</P>
        <P>• Internet access on the first start (the DEFRA emission factors are downloaded from GOV.UK once).</P>
        <P>• Optional: a Gemini API key, to test the AI features (column mapping, factor matching, assistant).</P>

        <Text style={s.h2}>2. Start everything</Text>
        <P>From the repository folder:</P>
        <Code>{'docker compose -f compose.local.yaml up -d --build'}</Code>
        <P>With AI features enabled:</P>
        <Code>{'GEMINI_API_KEY=your-key docker compose -f compose.local.yaml up -d --build'}</Code>
        <P>
          The first build takes a few minutes. A one-time <B>setup</B> step then applies the database migrations,
          imports the 2,622 DEFRA 2026 emission factors and creates the super admin. Check it finished:
        </P>
        <Code>
          {
            'docker compose -f compose.local.yaml logs setup\n# ... Migrations applied. / Imported 2622 factors as DEFRA_2026. / Setup complete.'
          }
        </Code>

        <Text style={s.h2}>3. Addresses and accounts</Text>
        <Table
          widths={[30, 70]}
          rows={[
            ['What', 'Where'],
            ['Web app', 'http://localhost:8080'],
            [
              'Email inbox (Mailpit)',
              'http://localhost:8025 — verification links, invitations and new passwords arrive here',
            ],
            ['API health', 'http://localhost:8080/api/health — should show database "up" and redis "up"'],
            ['Super admin', 'admin@carbonglint.local  /  LocalAdmin123'],
            [
              'Your test company',
              'Sign up with any work-style address, e.g. you@acmecorp.io (password: 10+ characters with a letter and a number)',
            ],
          ]}
        />
        <Text style={[s.muted, { marginTop: 6 }]}>
          Emails are never really sent locally — they are caught by Mailpit. Personal providers (Gmail, Outlook, Yahoo…)
          are rejected by design.
        </Text>
        <Footer />
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.h1}>4. Test checklist</Text>
        <Text style={[s.muted, { marginBottom: 6 }]}>
          Work through the sections in order — later steps use data from earlier ones.
        </Text>

        <Text style={s.h2}>4.1 Sign-up, verification and onboarding</Text>
        <Check
          action="Open http://localhost:8080 and click Get started. Sign up with a @gmail.com address."
          expect='"Please use your work email address" — sign-up is blocked.'
        />
        <Check action="Sign up again with you@acmecorp.io." expect='"Check your inbox" screen.' />
        <Check
          action="Try to sign in before verifying."
          expect='Warning "Please verify your email first" with a Resend link.'
        />
        <Check
          action="Open http://localhost:8025, open the Carbon Glint email and click Verify email."
          expect="You are signed in and taken to onboarding."
        />
        <Check
          action="Complete onboarding: company name, industry (e.g. Manufacturing), employees, number of branches, website, LinkedIn company URL (https://www.linkedin.com/company/acme)."
          expect="The Dashboard opens; your company name is shown in the top bar."
        />

        <Text style={s.h2}>4.2 Org Units</Text>
        <Check
          action="Open Org Units. An HQ unit already exists. Use the + button on HQ to add 'Pune Plant' (code PUN, type Plant, country India) and 'Dubai Office' (code DXB, United Arab Emirates)."
          expect="Both appear under HQ in the tree."
        />
        <Check
          action="Drag Dubai Office onto Pune Plant."
          expect="It moves under Pune Plant. Dragging HQ under one of its own children is refused."
        />
        <Check
          action="Switch to the Table view; edit a unit; try adding a second unit with code PUN."
          expect='Indented table; "Code PUN is already used" error on the duplicate.'
        />

        <Text style={s.h2}>4.3 Activity Definitions and upload</Text>
        <Check
          action="Open Activity Definitions and click New activity definition. Choose Scope 2 and category 'Purchased electricity' (listed under Recommended), period 2026-01-01 to 2026-03-31."
          expect="The definition page opens with status Draft."
        />
        <Check
          action="Click Upload source sheet. In the wizard, click Download Excel template."
          expect="carbon-glint-activity-template.xlsx downloads (Instructions + Activities sheets)."
        />
        <Check
          action="Upload that file. On 'Sheet & header', pick the Activities sheet."
          expect="Preview of 10 rows with detected columns."
        />
        <Check
          action="Choose Map manually (or Automatically infer if you set a Gemini key) and map Activity description, Measure and Unit (plus Business unit and Period)."
          expect="Next becomes enabled once the three required fields are mapped; AI mode shows confidence percentages."
        />
        <Check action="Click Import." expect="'Imported 10 activities.' The Activities table shows the rows." />
        <Check
          action="Upload a CSV with a bad row (e.g. Measure 'lots' or Unit 'bananas') and import without 'valid rows only'."
          expect="Import stops and lists each problem with its sheet row number."
        />
        <Footer />
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.h2}>4.4 Emission factors and calculation</Text>
        <Check
          action="On the definition page click Publish."
          expect="'Emission factors are being matched…' — the worker calculates within a few seconds."
        />
        <Check
          action="Open Emission Factors. The source chip shows DEFRA_2026 · 2,622 factors."
          expect="The lasagne heatmap shows emissions per month."
        />
        <Check
          action="Click a row in the heatmap (or View as table, then click a row) to drill down Scope › Category › Definition › Activity; use the breadcrumb to go back."
          expect="Each level narrows the data; totals stay consistent."
        />
        <Check
          action="Switch to 'By business unit' and Quarter/Year buckets."
          expect="Rows become business units; columns regroup."
        />
        <Check
          action="Open the Activities tab and click an activity."
          expect="The GHG traceability drawer: input row, classification, factor match, unit conversion, DEFRA factor with licence and link, and the formula."
        />
        <Check
          action="Click Override, search a factor (e.g. 'petrol'), pick one, enter a reason, Apply. Then try Custom result. Finally click Revert override."
          expect="Status changes to Overridden with history; revert restores the calculated value."
        />
        <Text style={[s.muted, { marginBottom: 6 }]}>
          Without a Gemini key, matches use full-text search and are marked "Needs review" — this is expected. Put each
          activity in the right scope (electricity in Scope 2, fuels in Scope 1) for the best matches.
        </Text>

        <Text style={s.h2}>4.5 Dashboard</Text>
        <Check
          action="Open Dashboard."
          expect="KPI cards (total, Scope 1/2/3, data quality), lasagne view, scope trend, top emitting activities and the business-unit tree."
        />
        <Check
          action="Click a business unit in the tree; click it again."
          expect="The whole dashboard filters to that unit and its sub-units, then clears."
        />

        <Text style={s.h2}>4.6 Reports</Text>
        <Check
          action="Open Reports. Choose HQ, format 'India — SEBI BRSR', period 2026-01-01 to 2026-03-31, Generate PDF."
          expect="Status goes from queued to ready; Download PDF gives a branded 4-page report."
        />
        <Check
          action="Repeat with another format (US SB 253, UAE, Saudi, Australia, Singapore, NIRF/NAAC)."
          expect="Each PDF shows that framework's disclosure table."
        />

        <Text style={s.h2}>4.7 Team, passwords and the platform console</Text>
        <Check
          action="In Settings, invite colleague@acmecorp.io. Open the email in Mailpit, accept, choose a name and password."
          expect="The colleague is signed in to the same company. Inviting an address from another domain is refused."
        />
        <Check
          action="Sign out, click Forgot password, enter your email; read the new password in Mailpit and sign in."
          expect="Sign-in works with the emailed password and a banner asks you to change it."
        />
        <Check
          action="Sign in as admin@carbonglint.local / LocalAdmin123."
          expect="The Companies console lists Acme Corp; open it, disable it, and its users can no longer sign in. Re-enable it."
        />
        <Check
          action="(Only with a Gemini key) Ask the Assistant: 'Which business unit emits the most? Show a chart.'"
          expect="An answer grounded in your data with sources and a chart; 'View data' shows the numbers."
        />
        <Footer />
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.h1}>5. Stop, reset and troubleshoot</Text>
        <Text style={s.h2}>Stop and reset</Text>
        <Table
          widths={[40, 60]}
          rows={[
            ['Action', 'Command'],
            ['Stop (keep data)', 'docker compose -f compose.local.yaml down'],
            ['Stop and delete all data', 'docker compose -f compose.local.yaml down -v'],
            ['Rebuild after code changes', 'docker compose -f compose.local.yaml up -d --build'],
            ['See logs', 'docker compose -f compose.local.yaml logs -f api worker'],
            ['Service status', 'docker compose -f compose.local.yaml ps'],
          ]}
        />

        <Text style={s.h2}>Troubleshooting</Text>
        <Table
          widths={[38, 62]}
          rows={[
            ['Symptom', 'Fix'],
            [
              'Port 8080 or 8025 already in use',
              'Stop the other program (or an older Carbon Glint run) and start again.',
            ],
            [
              '"No emission factor databases loaded"',
              'The first start had no internet. Run: docker compose -f compose.local.yaml run --rm setup',
            ],
            ['Import or publish seems stuck', 'Check the worker: docker compose -f compose.local.yaml logs worker'],
            [
              'No email in Mailpit',
              'Wait a few seconds (emails are sent by the worker) and refresh http://localhost:8025.',
            ],
            ['Assistant says AI is not configured', 'Restart with GEMINI_API_KEY=your-key in front of the up command.'],
            ['Everything acts strangely after many tests', 'Reset with down -v, then up again.'],
          ]}
        />

        <Text style={s.h2}>What is not covered locally</Text>
        <P>
          Real email delivery (needs an SMTP relay), HTTPS and the public URL (Cloudflare Tunnel) are part of the
          production deployment on the GCP VM — see apps/infra/README.md. Reports are not assured; review them with an
          ESG / compliance professional before filing.
        </P>
        <Footer />
      </Page>
    </Document>
  );
}

const out = fileURLToPath(new URL('../../../docs/local-testing-guide.pdf', import.meta.url));
await renderToFile(<Guide />, out);
console.log(`Wrote ${out}`);
