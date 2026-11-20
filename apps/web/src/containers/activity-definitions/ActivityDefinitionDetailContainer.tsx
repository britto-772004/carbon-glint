import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteActivityDefinitionMutation,
  deleteDataSourceMutation,
  getActivityDefinitionOptions,
  getActivityDefinitionQueryKey,
  getDataSourceOptions,
  importDataSourceMutation,
  listActivitiesOptions,
  listActivitiesQueryKey,
  listOrgUnitsOptions,
  publishActivityDefinitionMutation,
  suggestColumnMappingMutation,
  updateDataSourceLayoutMutation,
  uploadDataSourceMutation,
  type ColumnMapping,
  type DataSource,
  type MappingSuggestion,
} from '@carbon-glint/sdk';
import { useNavigate, useParams } from 'react-router';
import { ActivityDefinitionDetailPage } from '../../components/activity-definitions/ActivityDefinitionDetailPage';
import { emptyMapping } from '../../components/activity-definitions/mapping-fields';
import { UploadWizard, type MappingMode } from '../../components/activity-definitions/UploadWizard';
import { toErrorMessage } from '../../lib/errors';

const PAGE_SIZE = 25;

export function ActivityDefinitionDetailContainer() {
  const { activityDefinitionId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const path = { activityDefinitionId };

  const [page, setPage] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [ds, setDs] = useState<DataSource>();
  const [mappingMode, setMappingMode] = useState<MappingMode | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping);
  const [suggestion, setSuggestion] = useState<MappingSuggestion>();
  const [onlyValidRows, setOnlyValidRows] = useState(false);
  const [notice, setNotice] = useState<string>();

  const detail = useQuery(getActivityDefinitionOptions({ path }));
  const activities = useQuery(listActivitiesOptions({ path, query: { limit: PAGE_SIZE, offset: page * PAGE_SIZE } }));
  const orgUnits = useQuery(listOrgUnitsOptions());
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getActivityDefinitionQueryKey({ path }) }),
      queryClient.invalidateQueries({ queryKey: listActivitiesQueryKey({ path }) }),
    ]);

  // Poll the data source while its import runs.
  const polled = useQuery({
    ...getDataSourceOptions({ path: { dataSourceId: ds?.id ?? '' } }),
    enabled: Boolean(ds && ds.status === 'importing'),
    refetchInterval: 1500,
  });
  const liveDs = polled.data && polled.data.id === ds?.id ? polled.data : ds;
  if (liveDs && ds && liveDs.status !== ds.status) {
    setDs(liveDs);
    if (liveDs.status !== 'importing') void refresh();
  }

  const upload = useMutation({
    ...uploadDataSourceMutation(),
    onSuccess: (created) => {
      setDs(created);
      setStep(1);
      void refresh();
    },
  });
  const relayout = useMutation({ ...updateDataSourceLayoutMutation(), onSuccess: (updated) => setDs(updated) });
  const suggest = useMutation({
    ...suggestColumnMappingMutation(),
    onSuccess: (s) => {
      setSuggestion(s);
      setMapping(s.mapping);
    },
  });
  const startImport = useMutation({ ...importDataSourceMutation(), onSuccess: (updated) => setDs(updated) });
  const publish = useMutation({
    ...publishActivityDefinitionMutation(),
    onSuccess: () => {
      setNotice('Published. Emission factors are being matched and emissions calculated.');
      void refresh();
    },
  });
  const removeAd = useMutation({
    ...deleteActivityDefinitionMutation(),
    onSuccess: () => navigate('/app/activity-definitions'),
  });
  const removeDs = useMutation({ ...deleteDataSourceMutation(), onSuccess: refresh });

  const closeWizard = () => {
    setWizardOpen(false);
    setStep(0);
    setDs(undefined);
    setMappingMode(null);
    setMapping(emptyMapping());
    setSuggestion(undefined);
    upload.reset();
    startImport.reset();
    void refresh();
  };

  const chooseMode = (mode: MappingMode) => {
    setMappingMode(mode);
    if (!ds) return;
    if (mode === 'ai') suggest.mutate({ path: { dataSourceId: ds.id } });
    else setMapping(emptyMapping());
  };

  return (
    <ActivityDefinitionDetailPage
      detail={detail.data}
      isLoading={detail.isPending}
      error={toErrorMessage(detail.error)}
      orgUnits={orgUnits.data ?? []}
      activities={activities.data}
      page={page}
      rowsPerPage={PAGE_SIZE}
      onPageChange={setPage}
      onBack={() => navigate('/app/activity-definitions')}
      onPublish={() => publish.mutate({ path })}
      isPublishing={publish.isPending}
      actionError={toErrorMessage(publish.error ?? removeAd.error ?? removeDs.error)}
      notice={notice}
      onDelete={() => removeAd.mutate({ path })}
      onAddDataSource={() => setWizardOpen(true)}
      onDeleteDataSource={(dataSourceId) => removeDs.mutate({ path: { dataSourceId } })}
      wizard={
        <UploadWizard
          open={wizardOpen}
          step={step}
          onClose={closeWizard}
          onBack={() => {
            if (step === 2 && mappingMode) return setMappingMode(null);
            setStep(Math.max(0, step - 1));
          }}
          onNext={() => setStep(step + 1)}
          onFile={(file) => upload.mutate({ path, body: { file } })}
          isUploading={upload.isPending}
          uploadError={toErrorMessage(upload.error)}
          dataSource={liveDs}
          onLayoutChange={(change) => ds && relayout.mutate({ path: { dataSourceId: ds.id }, body: change })}
          isRelayouting={relayout.isPending}
          mappingMode={mappingMode}
          onChooseMode={chooseMode}
          suggestion={suggestion}
          isSuggesting={suggest.isPending}
          mapping={mapping}
          onMappingChange={(field, column) => setMapping((m) => ({ ...m, [field]: column }))}
          onlyValidRows={onlyValidRows}
          onToggleOnlyValid={setOnlyValidRows}
          onImport={() =>
            ds &&
            startImport.mutate({
              path: { dataSourceId: ds.id },
              body: { mapping, mappingMode: mappingMode ?? 'manual', onlyValidRows },
            })
          }
          isImporting={startImport.isPending}
          importError={toErrorMessage(startImport.error)}
        />
      }
    />
  );
}
