import React, { useEffect, useState } from 'react';
import { Portal, Dialog, TextInput, Button, HelperText } from 'react-native-paper';
import { useInputDialogStore } from '@store/inputDialogStore';

export function InputDialogHost() {
  const config = useInputDialogStore((s) => s.config);
  const close = useInputDialogStore((s) => s.close);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(undefined);

  useEffect(() => {
    if (config) {
      const initial = config.initialValue ?? '';
      setValue(initial);
      setError(null);
      setSubmitting(false);
      if (config.selectBaseName) {
        const dotIndex = initial.lastIndexOf('.');
        setSelection({ start: 0, end: dotIndex > 0 ? dotIndex : initial.length });
      } else {
        setSelection(undefined);
      }
    }
  }, [config]);

  if (!config) return null;

  const handleConfirm = async () => {
    const validationError = config.validate?.(value) ?? null;
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      await config.onConfirm(value);
      close();
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Portal>
      <Dialog visible onDismiss={close}>
        <Dialog.Title>{config.title}</Dialog.Title>
        <Dialog.Content>
          <TextInput
            mode="outlined"
            label={config.label ?? 'Name'}
            value={value}
            onChangeText={(t) => {
              setValue(t);
              if (error) setError(null);
            }}
            selection={selection}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            autoFocus
            error={!!error}
          />
          {error && <HelperText type="error">{error}</HelperText>}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={close}>Cancel</Button>
          <Button onPress={handleConfirm} loading={submitting} disabled={submitting || value.trim().length === 0}>
            {config.confirmLabel ?? 'Confirm'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
