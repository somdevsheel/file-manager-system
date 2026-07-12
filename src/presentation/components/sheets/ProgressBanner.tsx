import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, ProgressBar, IconButton } from 'react-native-paper';
import { useOperationsStore } from '@store/operationsStore';
import { FileOperationsService } from '@services/FileOperationsService';
import { ArchiveService } from '@services/ArchiveService';
import { useAppTheme } from '@theme/ThemeProvider';
import { formatBytes } from '@utils/format';

const TYPE_LABELS: Record<string, string> = {
  copy: 'Copying',
  move: 'Moving',
  delete: 'Deleting',
  zip: 'Compressing',
  unzip: 'Extracting',
};

export function ProgressBanner() {
  const theme = useAppTheme();
  const operations = useOperationsStore((s) => s.operations);
  const dismiss = useOperationsStore((s) => s.dismissOperation);
  const active = Object.values(operations).filter((op) => !op.done || Date.now() - op.startedAt < 1500);

  if (active.length === 0) return null;

  return (
    <View style={styles.stack} pointerEvents="box-none">
      {active.map((op) => {
        const progress = op.totalBytes > 0 ? op.processedBytes / op.totalBytes : op.totalCount > 0 ? op.processedCount / op.totalCount : 0;
        return (
          <View
            key={op.operationId}
            style={[styles.card, { backgroundColor: theme.colors.elevation.level3, borderRadius: theme.custom.radius.md }]}
          >
            <View style={styles.headerRow}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurface, flex: 1 }} numberOfLines={1}>
                {op.done ? (op.cancelled ? 'Cancelled' : op.error ? 'Failed' : 'Done') : `${TYPE_LABELS[op.type] ?? 'Working'} · ${op.label}`}
              </Text>
              {!op.done ? (
                <IconButton
                  icon="close"
                  size={16}
                  onPress={() => {
                    FileOperationsService.cancel(op.operationId);
                    ArchiveService.cancel(op.operationId);
                  }}
                />
              ) : (
                <IconButton icon="check" size={16} onPress={() => dismiss(op.operationId)} />
              )}
            </View>
            {!op.done && (
              <>
                <ProgressBar progress={Math.min(1, Math.max(0, progress))} color={theme.colors.primary} style={styles.bar} />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                  {op.currentFile ? `${op.currentFile} · ` : ''}
                  {op.totalBytes > 0
                    ? `${formatBytes(op.processedBytes)} / ${formatBytes(op.totalBytes)}`
                    : `${op.processedCount} / ${op.totalCount || '…'}`}
                </Text>
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    gap: 8,
  },
  card: {
    padding: 12,
    marginTop: 8,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bar: {
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    marginBottom: 4,
  },
});
