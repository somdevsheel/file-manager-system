import { navigate } from '@navigation/navigationRef';
import { ShareService } from '@services/ShareService';
import { FileCategory } from '@app-types/file';

/** Routes a tapped file to its dedicated in-app viewer, or hands off to another app as a fallback. */
export function openFilePreview(path: string, category: FileCategory): void {
  switch (category) {
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
      ShareService.openFile(path);
  }
}
