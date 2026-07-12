import { create } from 'zustand';
import { FileOperationProgress } from '@app-types/file';

export interface ActiveOperation extends FileOperationProgress {
  label: string;
  startedAt: number;
}

interface OperationsState {
  operations: Record<string, ActiveOperation>;
  /** Optional labels (e.g. "3 items") registered by the initiating screen, keyed by operationId. */
  pendingLabels: Record<string, string>;
  registerLabel: (operationId: string, label: string) => void;
  updateOperation: (progress: FileOperationProgress) => void;
  dismissOperation: (operationId: string) => void;
}

export const useOperationsStore = create<OperationsState>()((set, get) => ({
  operations: {},
  pendingLabels: {},

  registerLabel: (operationId, label) =>
    set({ pendingLabels: { ...get().pendingLabels, [operationId]: label } }),

  // Upserts on first progress event, so callers don't need to pre-register — the native
  // module is the source of truth for when an operation actually begins.
  updateOperation: (progress) => {
    const existing = get().operations[progress.operationId];
    const label = existing?.label ?? get().pendingLabels[progress.operationId] ?? progress.currentFile ?? '';
    set({
      operations: {
        ...get().operations,
        [progress.operationId]: {
          ...(existing ?? { startedAt: Date.now() }),
          ...progress,
          label,
        },
      },
    });
  },

  dismissOperation: (operationId) => {
    const next = { ...get().operations };
    const nextLabels = { ...get().pendingLabels };
    delete next[operationId];
    delete nextLabels[operationId];
    set({ operations: next, pendingLabels: nextLabels });
  },
}));
