/* eslint-env jest */
import 'react-native-gesture-handler/jestSetup';
import { NativeModules } from 'react-native';

// This app's custom native modules (android/app/.../filemanager) aren't registered in the Jest
// environment, but several files construct NativeEventEmitter at import time — stub them so
// module evaluation doesn't crash the whole tree during tests.
['FileSystem', 'FileOperations', 'MediaCategory', 'FileSearch', 'DuplicateFinder', 'ArchiveManager', 'ApkManager', 'FileShare', 'StorageAnalyzer', 'ThemeInfo'].forEach((name) => {
  NativeModules[name] = NativeModules[name] || { addListener: jest.fn(), removeListeners: jest.fn() };
});

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('react-native-mmkv', () => {
  class MMKV {
    store = new Map();
    getString(key) {
      return this.store.get(key);
    }
    set(key, value) {
      this.store.set(key, value);
    }
    delete(key) {
      this.store.delete(key);
    }
  }
  return { MMKV };
});

// Leaf native-bridge libraries: only need to avoid crashing module evaluation in tests, not behave.
jest.mock('react-native-pdf', () => ({ __esModule: true, default: () => null }));
jest.mock('react-native-video', () => ({ __esModule: true, default: () => null }));
jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {
    stat: jest.fn(() => Promise.resolve({ size: 0 })),
    readFile: jest.fn(() => Promise.resolve('')),
  },
}));
jest.mock('react-native-sqlite-storage', () => ({
  __esModule: true,
  default: {
    enablePromise: jest.fn(),
    openDatabase: jest.fn(() =>
      Promise.resolve({ executeSql: jest.fn(() => Promise.resolve([{ rows: { length: 0, item: () => undefined } }])) }),
    ),
  },
}));

jest.mock('react-native-track-player', () => ({
  __esModule: true,
  default: {
    setupPlayer: jest.fn(() => Promise.resolve()),
    registerPlaybackService: jest.fn(),
    reset: jest.fn(() => Promise.resolve()),
    add: jest.fn(() => Promise.resolve()),
    play: jest.fn(() => Promise.resolve()),
    pause: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
    skip: jest.fn(() => Promise.resolve()),
    skipToNext: jest.fn(() => Promise.resolve()),
    skipToPrevious: jest.fn(() => Promise.resolve()),
    seekTo: jest.fn(() => Promise.resolve()),
    getActiveTrack: jest.fn(() => Promise.resolve(null)),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  usePlaybackState: () => ({ state: 'none' }),
  useProgress: () => ({ position: 0, duration: 0, buffered: 0 }),
  State: { Playing: 'playing', Paused: 'paused' },
  Event: {
    RemotePlay: 'remote-play',
    RemotePause: 'remote-pause',
    RemoteStop: 'remote-stop',
    RemoteNext: 'remote-next',
    RemotePrevious: 'remote-previous',
    RemoteSeek: 'remote-seek',
    PlaybackActiveTrackChanged: 'playback-active-track-changed',
  },
}));
