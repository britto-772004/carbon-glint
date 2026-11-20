import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createOrgUnitMutation,
  deleteOrgUnitMutation,
  listOrgUnitsOptions,
  listOrgUnitsQueryKey,
  updateOrgUnitMutation,
  type OrgUnit,
} from '@carbon-glint/sdk';
import type { Edge, Node, NodeChangeset } from '@xyflow/react';
import type { OrgUnitFormValues } from '../../components/org-units/OrgUnitDialog';
import type { OrgUnitFlowNode } from '../../components/org-units/OrgUnitNode';
import { OrgUnitsPage, type OrgView } from '../../components/org-units/OrgUnitsPage';
import { toErrorMessage } from '../../lib/errors';
import { descendantsOf, findDropTarget, flattenTree, layoutTree } from '../../lib/org-tree';

type DialogState = { mode: 'create'; parentId: string | null } | { mode: 'edit'; unit: OrgUnit } | null;

export function OrgUnitsContainer() {
  const queryClient = useQueryClient();
  const units = useQuery(listOrgUnitsOptions());
  const [view, setView] = useState<OrgView>('chart');
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrgUnit>();
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>();
  const actions = {
    onAddChild: (parent: OrgUnit) => setDialog({ mode: 'create', parentId: parent.id }),
    onEdit: (unit: OrgUnit) => setDialog({ mode: 'edit', unit }),
    onDelete: (unit: OrgUnit) => setDeleteTarget(unit),
  };

  const list = useMemo(() => units.data ?? [], [units.data]);
  const layout = useMemo(() => layoutTree(list), [list]);
  const buildNodes = (): OrgUnitFlowNode[] =>
    list.map((unit) => ({
      id: unit.id,
      type: 'orgUnit',
      position: layout[unit.id] ?? { x: 0, y: 0 },
      data: { unit, isDropTarget: false, ...actions },
    }));
  const [nodes, setNodes] = useState<OrgUnitFlowNode[]>([]);
  // Re-sync nodes from the auto-layout whenever the tree changes (derived state, also snaps back failed drags).
  const [syncedList, setSyncedList] = useState<OrgUnit[] | undefined>();
  if (syncedList !== list) {
    setSyncedList(list);
    setNodes(buildNodes());
  }
  const refresh = () => queryClient.invalidateQueries({ queryKey: listOrgUnitsQueryKey() });

  const create = useMutation({ ...createOrgUnitMutation(), onSuccess: () => (setDialog(null), refresh()) });
  const update = useMutation({ ...updateOrgUnitMutation(), onSuccess: () => (setDialog(null), refresh()) });
  const move = useMutation({ ...updateOrgUnitMutation(), onSettled: refresh });
  const remove = useMutation({ ...deleteOrgUnitMutation(), onSuccess: () => (setDeleteTarget(undefined), refresh()) });

  const nodesWithHighlight = useMemo(
    () =>
      nodes.map((n) =>
        n.data.isDropTarget === (n.id === dropTargetId)
          ? n
          : { ...n, data: { ...n.data, isDropTarget: n.id === dropTargetId } },
      ),
    [nodes, dropTargetId],
  );
  const edges: Edge[] = useMemo(
    () =>
      list
        .filter((u) => u.parentId)
        .map((u) => ({ id: `${u.parentId}-${u.id}`, source: u.parentId!, target: u.id, type: 'smoothstep' })),
    [list],
  );

  const validTarget = (draggedId: string, targetId: string | null) =>
    targetId &&
    !descendantsOf(list, draggedId).has(targetId) &&
    list.find((u) => u.id === draggedId)?.parentId !== targetId;

  const onNodeDrag = (node: Node) => {
    const target = findDropTarget(node.id, node.position, layout);
    setDropTargetId(validTarget(node.id, target) ? target : null);
  };
  const onNodeDragStop = (node: Node) => {
    const target = findDropTarget(node.id, node.position, layout);
    setDropTargetId(null);
    if (validTarget(node.id, target)) {
      const parent = list.find((u) => u.id === target)!;
      setNotice(`Moved ${list.find((u) => u.id === node.id)?.name} under ${parent.name}.`);
      move.mutate({ path: { orgUnitId: node.id }, body: { parentId: target } });
    } else {
      setNodes((ns) => ns.map((n) => (n.id === node.id ? { ...n, position: layout[n.id]! } : n)));
    }
  };

  const editing = dialog?.mode === 'edit' ? dialog.unit : undefined;
  const excluded = editing ? descendantsOf(list, editing.id) : new Set<string>();
  const submitDialog = (v: OrgUnitFormValues) => {
    if (!dialog) return;
    if (dialog.mode === 'create') {
      const { active: _active, ...body } = v;
      create.mutate({ body });
    } else {
      update.mutate({ path: { orgUnitId: dialog.unit.id }, body: v });
    }
  };

  return (
    <OrgUnitsPage
      isLoading={units.isPending}
      error={toErrorMessage(units.error ?? move.error ?? remove.error)}
      notice={move.isSuccess ? notice : undefined}
      view={view}
      onViewChange={setView}
      onAddRoot={() => setDialog({ mode: 'create', parentId: list.find((u) => u.type === 'hq')?.id ?? null })}
      unitCount={list.length}
      rows={flattenTree(list)}
      nodes={nodesWithHighlight}
      edges={edges}
      onNodesChange={(changes: NodeChangeset<OrgUnitFlowNode>) => setNodes((ns) => changes.applyTo(ns))}
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      dialog={{
        open: Boolean(dialog),
        mode: dialog?.mode ?? 'create',
        unit: editing,
        parentId: dialog?.mode === 'create' ? dialog.parentId : null,
        parentOptions: list.filter((u) => !excluded.has(u.id)),
        isSubmitting: create.isPending || update.isPending,
        error: toErrorMessage(create.error ?? update.error),
        onClose: () => {
          create.reset();
          update.reset();
          setDialog(null);
        },
        onSubmit: submitDialog,
      }}
      deleteTarget={deleteTarget}
      isDeleting={remove.isPending}
      onConfirmDelete={() => deleteTarget && remove.mutate({ path: { orgUnitId: deleteTarget.id } })}
      onCancelDelete={() => setDeleteTarget(undefined)}
      {...actions}
    />
  );
}
