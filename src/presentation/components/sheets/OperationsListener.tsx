import { useEffect } from 'react';
import { fileOperationsEmitter, archiveManagerEmitter } from '@native/modules';
import { useOperationsStore } from '@store/operationsStore';
import { FileOperationProgress } from '@app-types/file';

/** Mounted once at the app root; forwards native progress events into the global operations store. */
export function OperationsListener() {
  useEffect(() => {
    const handler = (event: FileOperationProgress) => {
      useOperationsStore.getState().updateOperation(event);
    };
    const sub1 = fileOperationsEmitter.addListener('FileOperationProgress', handler);
    const sub2 = archiveManagerEmitter.addListener('FileOperationProgress', handler);
    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, []);

  return null;
}
