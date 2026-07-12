import { create } from 'zustand';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface ConfirmDialogState {
  config: ConfirmDialogConfig | null;
  open: (config: ConfirmDialogConfig) => void;
  close: () => void;
}

export const useConfirmDialogStore = create<ConfirmDialogState>()((set) => ({
  config: null,
  open: (config) => set({ config }),
  close: () => set({ config: null }),
}));
