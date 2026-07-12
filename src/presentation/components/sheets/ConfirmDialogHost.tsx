import React, { useState } from 'react';
import { Portal, Dialog, Button, Text } from 'react-native-paper';
import { useConfirmDialogStore } from '@store/confirmDialogStore';
import { useAppTheme } from '@theme/ThemeProvider';

export function ConfirmDialogHost() {
  const config = useConfirmDialogStore((s) => s.config);
  const close = useConfirmDialogStore((s) => s.close);
  const [submitting, setSubmitting] = useState(false);
  const theme = useAppTheme();

  if (!config) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await config.onConfirm();
    } finally {
      setSubmitting(false);
      close();
    }
  };

  return (
    <Portal>
      <Dialog visible onDismiss={close}>
        <Dialog.Title>{config.title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{config.message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={close}>Cancel</Button>
          <Button
            onPress={handleConfirm}
            loading={submitting}
            textColor={config.destructive ? theme.colors.error : undefined}
          >
            {config.confirmLabel ?? 'Confirm'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
