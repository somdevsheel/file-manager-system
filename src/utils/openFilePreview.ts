import { navigate } from '@navigation/navigationRef';
import { ShareService } from '@services/ShareService';
import { FileCategory, FileEntry } from '@app-types/file';
import { notifyError } from '@utils/notify';

/** Image paths among `entries`, in display order — lets the image viewer swipe between them. */
export function imageSiblings(entries: FileEntry[]): string[] {
  return entries.filter((e) => !e.isDirectory && e.category === FileCategory.Image).map((e) => e.path);
}

/** Routes a tapped file to its dedicated in-app viewer, or hands off to another app as a fallback. */
export function openFilePreview(path: string, category: FileCategory, siblingPaths?: string[]): void {
  switch (category) {
    case FileCategory.Image:
      navigate('ImageViewer', { path, siblingPaths: siblingPaths?.includes(path) ? siblingPaths : undefined });
      break;
    case FileCategory.Pdf:
      navigate('PdfViewer', { path });
      break;
    case FileCategory.Video:
      navigate('VideoPlayer', { path });
      break;
    case FileCategory.Audio:
      navigate('AudioPlayer', { path });
      break;
    case FileCategory.Text:
    case FileCategory.Json:
    case FileCategory.Xml:
    case FileCategory.Code:
      navigate('TextViewer', { path });
      break;
    case FileCategory.Apk:
      navigate('ApkDetails', { path });
      break;
    default:
      ShareService.openFile(path).catch((e) => notifyError(e, 'No app found to open this file'));
  }
}
