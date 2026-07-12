import { create } from 'zustand';

export interface InputDialogConfig {
  title: string;
  label?: string;
  initialValue?: string;
  confirmLabel?: string;
  selectBaseName?: boolean; // pre-select name without extension, useful for rename
  validate?: (value: string) => string | null; // return error message, or null if valid
  onConfirm: (value: string) => void | Promise<void>;
}

interface InputDialogState {
  config: InputDialogConfig | null;
  open: (config: InputDialogConfig) => void;
  close: () => void;
}

export const useInputDialogStore = create<InputDialogState>()((set) => ({
  config: null,
  open: (config) => set({ config }),
  close: () => set({ config: null }),
}));
