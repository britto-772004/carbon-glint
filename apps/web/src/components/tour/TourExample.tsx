import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { IndustryExample } from '../../lib/industry-examples';
import type { TourExampleKind } from '../../lib/tour';

export interface TourExampleProps {
  kind: TourExampleKind;
  example: IndustryExample;
  onDownload: (definitionIndex: number) => void;
}

const SCOPE_COLOR = { 1: 'warning', 2: 'primary', 3: 'secondary' } as const;

function Line({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="caption" sx={{ fontWeight: 600, textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  );
}

/** "Example for <industry>" panel inside a tour step. */
export function TourExample({ kind, example: ex, onDownload }: TourExampleProps) {
  const first = ex.definitions[0]!;
  const body = (() => {
    switch (kind) {
      case 'company':
        return (
          <Stack spacing={0.5}>
            <Line label="Company" value={ex.company} />
            <Line label="Industry" value={ex.industryName} />
            <Line label="Employees" value={ex.employeeBand} />
            <Line label="Website" value={ex.website} />
            <Line label="LinkedIn (optional)" value={ex.linkedinUrl.replace('https://www.', '')} />
          </Stack>
        );
      case 'orgUnits':
        return (
          <Stack spacing={0.5}>
            {ex.orgUnits.map((u) => (
              <Stack key={u.code} direction="row" spacing={1} sx={{ alignItems: 'center', pl: u.parent ? 2 : 0 }}>
                <Chip size="small" label={u.code} variant="outlined" />
                <Typography variant="caption" sx={{ flex: 1 }}>
                  {u.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {u.type} · {u.city}
                </Typography>
              </Stack>
            ))}
          </Stack>
        );
      case 'categories':
      case 'definitions':
        return (
          <Stack spacing={0.75}>
            {ex.definitions.map((d) => (
              <Stack key={d.name} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Chip size="small" color={SCOPE_COLOR[d.scope]} label={`S${d.scope}`} />
                <Typography variant="caption" sx={{ flex: 1, fontWeight: 600 }}>
                  {kind === 'categories' ? d.categoryName : d.name}
                </Typography>
                {kind === 'definitions' && (
                  <Typography variant="caption" color="text.secondary">
                    {d.categoryName}
                  </Typography>
                )}
              </Stack>
            ))}
          </Stack>
        );
      case 'upload':
        return (
          <Stack spacing={1}>
            <Table size="small" sx={{ '& td, & th': { px: 0.75, py: 0.25, fontSize: 11 } }}>
              <TableHead>
                <TableRow>
                  <TableCell>Activity Description</TableCell>
                  <TableCell align="right">Measure</TableCell>
                  <TableCell>Unit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {first.rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.description}</TableCell>
                    <TableCell align="right">{r.measure.toLocaleString()}</TableCell>
                    <TableCell>{r.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              {ex.definitions.map((d, i) => (
                <Button
                  key={d.name}
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadOutlined fontSize="small" />}
                  onClick={() => onDownload(i)}
                  sx={{ fontSize: 11, py: 0.25 }}
                >
                  S{d.scope} sample CSV
                </Button>
              ))}
            </Stack>
          </Stack>
        );
      case 'publish':
        return (
          <Stack spacing={0.5}>
            <Line label="Row" value={`${first.rows[0]!.description}`} />
            <Line label="Input" value={`${first.rows[0]!.measure.toLocaleString()} ${first.rows[0]!.unit}`} />
            <Line label="Matched factor" value="DEFRA / GHG Protocol library, best unit + region match" />
            <Line label="Result" value="measure × conversion × factor = kg CO2e" />
            <Line label="Status" value="matched · needs review (< 60% confidence) · unmatched" />
          </Stack>
        );
      case 'maintenance':
        return (
          <Stack spacing={0.5}>
            <Line label="1" value="Open a published definition → Activities" />
            <Line label="2" value="Tick the wrong rows → Delete selected" />
            <Line label="3" value="Press Recalculate (optionally reset overrides)" />
          </Stack>
        );
      case 'factors':
        return (
          <Stack spacing={0.5}>
            {ex.definitions.slice(0, 3).map((d) => (
              <Line
                key={d.name}
                label={d.rows[0]!.description}
                value={`${d.rows[0]!.measure.toLocaleString()} ${d.rows[0]!.unit}`}
              />
            ))}
          </Stack>
        );
      case 'dashboard':
        return (
          <Stack spacing={0.5}>
            {ex.orgUnits.map((u) => (
              <Line
                key={u.code}
                label={`${u.code} · ${u.name}`}
                value={u.parent ? 'rolls up to HQ' : 'total of all units'}
              />
            ))}
          </Stack>
        );
      case 'report':
        return (
          <Stack spacing={0.5}>
            <Line label="Business unit" value={ex.orgUnits[0]!.name} />
            <Line label="Period" value="2026-01-01 → 2026-12-31" />
            <Line label="Format" value={ex.reportFormat} />
          </Stack>
        );
      case 'assistant':
        return (
          <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
            “{ex.assistantQuestion}”
          </Typography>
        );
      case 'team':
        return <Line label="Invite" value={`priya@${new URL(ex.website).hostname.replace(/\.example$/, '.com')}`} />;
    }
  })();

  return (
    <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}>
      <Typography variant="overline" color="primary" sx={{ lineHeight: 1.6, display: 'block' }}>
        Example · {ex.industryName}
      </Typography>
      {body}
    </Box>
  );
}
