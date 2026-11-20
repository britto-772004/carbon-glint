import type { ActivityDefinition, GhgCategory, Scope } from '@carbon-glint/sdk';
import AddRounded from '@mui/icons-material/AddRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { SCOPES } from './scope';

export interface ScopeCategoryBoardProps {
  industryName?: string;
  categories?: GhgCategory[];
  definitions?: ActivityDefinition[];
  isLoading: boolean;
  expandedScopes: Scope[];
  onToggleExpanded: (scope: Scope) => void;
  /** Start a new definition pre-filled with this category. */
  onCreate: (scope: Scope, categoryId: string) => void;
  /** Filter the list below to this category's definitions. */
  onSelectCategory: (categoryId: string | null) => void;
  selectedCategoryId: string | null;
}

const ACCENT: Record<Scope, string> = { 1: 'warning.main', 2: 'primary.main', 3: 'secondary.main' };
const VISIBLE = 5;

/** Scope 1 / 2 / 3 columns listing GHG categories — industry recommendations first, always visible. */
export function ScopeCategoryBoard(p: ScopeCategoryBoardProps) {
  const counts = new Map<string, number>();
  for (const d of p.definitions ?? []) counts.set(d.category.id, (counts.get(d.category.id) ?? 0) + 1);

  return (
    <Box data-tour="ad-categories">
      <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          GHG categories{p.industryName ? ` for ${p.industryName}` : ''}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
          <StarRounded sx={{ fontSize: 14, verticalAlign: 'text-bottom', color: 'warning.main' }} /> recommended for
          your industry · click a category to filter · + to create
        </Typography>
      </Stack>
      <Grid container spacing={2}>
        {SCOPES.map((s) => {
          const all = (p.categories ?? []).filter((c) => c.scope === s.value);
          const recommended = all.filter((c) => c.recommended);
          const rest = all.filter((c) => !c.recommended);
          const expanded = p.expandedScopes.includes(s.value);
          const ordered = [...recommended, ...rest];
          const shown = expanded ? ordered : ordered.slice(0, Math.max(VISIBLE, recommended.length));
          return (
            <Grid key={s.value} size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: '100%', borderTop: 4, borderTopColor: ACCENT[s.value] }}>
                <Stack sx={{ p: 1.5 }} spacing={0.5}>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {s.label}
                    </Typography>
                    <Chip size="small" label={`${recommended.length} recommended`} color={s.color} variant="outlined" />
                  </Stack>
                  {p.isLoading
                    ? [0, 1, 2, 3].map((i) => <Skeleton key={i} height={30} />)
                    : shown.map((c) => {
                        const n = counts.get(c.id) ?? 0;
                        const selected = p.selectedCategoryId === c.id;
                        return (
                          <Stack
                            key={c.id}
                            direction="row"
                            spacing={0.5}
                            sx={{
                              alignItems: 'center',
                              px: 1,
                              py: 0.25,
                              borderRadius: 1.5,
                              cursor: 'pointer',
                              bgcolor: selected ? 'action.selected' : 'transparent',
                              '&:hover': { bgcolor: 'action.hover' },
                            }}
                            onClick={() => p.onSelectCategory(selected ? null : c.id)}
                            title={c.description || c.name}
                          >
                            {c.recommended ? (
                              <StarRounded sx={{ fontSize: 16, color: 'warning.main' }} aria-label="Recommended" />
                            ) : (
                              <Box sx={{ width: 16 }} />
                            )}
                            <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                              {c.name}
                              {c.custom && (
                                <Typography component="span" variant="caption" color="text.secondary">
                                  {' '}
                                  · custom
                                </Typography>
                              )}
                            </Typography>
                            {n > 0 && <Chip size="small" label={n} sx={{ height: 20, fontSize: 11 }} />}
                            <Tooltip title={`New ${s.short} definition: ${c.name}`}>
                              <IconButton
                                size="small"
                                aria-label={`Create definition for ${c.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  p.onCreate(s.value, c.id);
                                }}
                              >
                                <AddRounded fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        );
                      })}
                  {!p.isLoading && ordered.length > shown.length && (
                    <Button size="small" onClick={() => p.onToggleExpanded(s.value)} sx={{ alignSelf: 'flex-start' }}>
                      Show all {ordered.length}
                    </Button>
                  )}
                  {!p.isLoading && expanded && ordered.length > VISIBLE && (
                    <Button size="small" onClick={() => p.onToggleExpanded(s.value)} sx={{ alignSelf: 'flex-start' }}>
                      Show fewer
                    </Button>
                  )}
                </Stack>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
