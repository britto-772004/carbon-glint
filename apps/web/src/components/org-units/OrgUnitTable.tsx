import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { countryName } from '../../lib/countries';
import type { TreeRow } from '../../lib/org-tree';
import { typeMeta, type OrgUnitActions } from './types';

export interface OrgUnitTableProps extends OrgUnitActions {
  rows: TreeRow[];
}

export function OrgUnitTable({ rows, onAddChild, onEdit, onDelete }: OrgUnitTableProps) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small" aria-label="Business units">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Code</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Location</TableCell>
            <TableCell align="right">Sub-units</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(({ unit, depth, childCount }) => (
            <TableRow key={unit.id} sx={{ opacity: unit.active ? 1 : 0.6 }}>
              <TableCell sx={{ pl: 2 + depth * 3 }}>
                <Typography component="span" sx={{ mr: 1 }} aria-hidden>
                  {typeMeta(unit.type).icon}
                </Typography>
                {unit.name}
                {!unit.active && <Chip size="small" label="Inactive" sx={{ ml: 1 }} />}
              </TableCell>
              <TableCell>{unit.code}</TableCell>
              <TableCell>{typeMeta(unit.type).label}</TableCell>
              <TableCell>{[unit.city, countryName(unit.country)].filter(Boolean).join(', ') || '—'}</TableCell>
              <TableCell align="right">{childCount}</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                <Button size="small" onClick={() => onAddChild(unit)}>
                  Add sub-unit
                </Button>
                <Button size="small" onClick={() => onEdit(unit)}>
                  Edit
                </Button>
                {unit.type !== 'hq' && (
                  <Button size="small" color="error" onClick={() => onDelete(unit)}>
                    Delete
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
