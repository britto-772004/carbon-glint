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
import { toErrorMessage } from '../../lib/errors';

export function ActivityDefinitionsContainer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [scopeFilter, setScopeFilter] = useState<Scope | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogScope, setDialogScope] = useState<Scope>(2);

  const definitions = useQuery(
    listActivityDefinitionsOptions({ query: scopeFilter === 'all' ? {} : { scope: scopeFilter } }),
  );
  const categories = useQuery({ ...listGhgCategoriesOptions(), enabled: dialogOpen });
  const orgUnits = useQuery({ ...listOrgUnitsOptions(), enabled: dialogOpen });

  const create = useMutation({
    ...createActivityDefinitionMutation(),
    onSuccess: (ad) => navigate(`/app/activity-definitions/${ad.id}`),
  });
  const addCategory = useMutation({
    ...createGhgCategoryMutation(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listGhgCategoriesQueryKey() }),
  });

  return (
    <ActivityDefinitionsPage
      definitions={definitions.data}
      isLoading={definitions.isPending}
      error={toErrorMessage(definitions.error)}
      scopeFilter={scopeFilter}
      onScopeFilter={setScopeFilter}
      onCreate={() => setDialogOpen(true)}
      onOpen={(id) => navigate(`/app/activity-definitions/${id}`)}
      dialog={
        <ActivityDefinitionDialog
          open={dialogOpen}
          scope={dialogScope}
          onScopeChange={setDialogScope}
          categories={(categories.data ?? []).filter((c) => c.scope === dialogScope)}
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
