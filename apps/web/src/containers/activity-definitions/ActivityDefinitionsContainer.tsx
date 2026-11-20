import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createActivityDefinitionMutation,
  createGhgCategoryMutation,
  listActivityDefinitionsOptions,
  listGhgCategoriesOptions,
  listGhgCategoriesQueryKey,
  listOrgUnitsOptions,
  type Scope,
} from '@carbon-glint/sdk';
import { useNavigate } from 'react-router';
import { ActivityDefinitionDialog } from '../../components/activity-definitions/ActivityDefinitionDialog';
import { ActivityDefinitionsPage } from '../../components/activity-definitions/ActivityDefinitionsPage';
import { ScopeCategoryBoard } from '../../components/activity-definitions/ScopeCategoryBoard';
import { toErrorMessage } from '../../lib/errors';
import { paginate, usePagination } from '../../lib/pagination';
import { useMe } from '../session/useMe';

export function ActivityDefinitionsContainer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { me } = useMe();
  const [scopeFilter, setScopeFilter] = useState<Scope | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [expandedScopes, setExpandedScopes] = useState<Scope[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogScope, setDialogScope] = useState<Scope>(2);
  const [initialCategoryId, setInitialCategoryId] = useState<string | null>(null);

  const definitions = useQuery(
    listActivityDefinitionsOptions({ query: scopeFilter === 'all' ? {} : { scope: scopeFilter } }),
  );
  const allDefinitions = useQuery(listActivityDefinitionsOptions());
  const categories = useQuery(listGhgCategoriesOptions());
  const orgUnits = useQuery({ ...listOrgUnitsOptions(), enabled: dialogOpen });

  const create = useMutation({
    ...createActivityDefinitionMutation(),
    onSuccess: (ad) => navigate(`/app/activity-definitions/${ad.id}`),
  });
  const addCategory = useMutation({
    ...createGhgCategoryMutation(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listGhgCategoriesQueryKey() }),
  });

  const openDialog = (scope: Scope = dialogScope, categoryId: string | null = null) => {
    setDialogScope(scope);
    setInitialCategoryId(categoryId);
    setDialogOpen(true);
  };
  const listed = (definitions.data ?? []).filter((d) => !categoryFilter || d.category.id === categoryFilter);

  const pagination = usePagination(listed.length);

  return (
    <ActivityDefinitionsPage
      summary={allDefinitions.data}
      definitions={definitions.data ? paginate(listed, pagination) : undefined}
      pagination={pagination}
      isLoading={definitions.isPending}
      error={toErrorMessage(definitions.error ?? categories.error)}
      scopeFilter={scopeFilter}
      onScopeFilter={setScopeFilter}
      categoryFilterName={categories.data?.find((c) => c.id === categoryFilter)?.name}
      onClearCategoryFilter={() => setCategoryFilter(null)}
      onCreate={() => openDialog()}
      onOpen={(id) => navigate(`/app/activity-definitions/${id}`)}
      board={
        <ScopeCategoryBoard
          industryName={me?.tenant?.industry?.name}
          categories={categories.data}
          definitions={allDefinitions.data}
          isLoading={categories.isPending}
          expandedScopes={expandedScopes}
          onToggleExpanded={(s) =>
            setExpandedScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))
          }
          onCreate={(scope, categoryId) => openDialog(scope, categoryId)}
          selectedCategoryId={categoryFilter}
          onSelectCategory={(id) => {
            setCategoryFilter(id);
            if (id) setScopeFilter('all');
          }}
        />
      }
      dialog={
        <ActivityDefinitionDialog
          open={dialogOpen}
          scope={dialogScope}
          onScopeChange={(s) => {
            setDialogScope(s);
            setInitialCategoryId(null);
          }}
          categories={(categories.data ?? []).filter((c) => c.scope === dialogScope)}
          initialCategoryId={initialCategoryId}
          orgUnits={orgUnits.data ?? []}
          isSubmitting={create.isPending}
          error={toErrorMessage(create.error)}
          onClose={() => {
            create.reset();
            setDialogOpen(false);
          }}
          onSubmit={(body) => create.mutate({ body })}
          onAddCategory={(name) => addCategory.mutate({ body: { scope: dialogScope, name } })}
          isAddingCategory={addCategory.isPending}
          addCategoryError={toErrorMessage(addCategory.error)}
        />
      }
    />
  );
}
