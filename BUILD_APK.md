# Building an APK for Testing

This guide covers producing an installable `.apk` of File Manager to hand to a tester, without going through the Play Store.

## Prerequisites

Only needed once, on the machine that builds the APK:

- Node.js 22+
- A JDK (17 is what this project is built/tested with)
- Android SDK with `ANDROID_HOME` set, plus the build-tools/platform matching `android/build.gradle` (`compileSdkVersion 36`, downloaded automatically by Gradle on first build if missing)

If none of this is set up yet, see the main [`README.md`](README.md) and the [React Native environment setup guide](https://reactnative.dev/docs/set-up-your-environment) first.

## 1. Install dependencies

```sh
npm install
```

This also re-applies the two native-module patches in `patches/` (`react-native-sqlite-storage`, `react-native-track-player`) automatically via the `postinstall` script — no extra step needed.

## 2. Build the APK

From the project root:

```sh
cd android
./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

This is the fastest option and is almost always the right choice for handing an APK to a tester — it installs and runs exactly like the dev build, just without needing Metro or a USB connection.

### Release build (optional)

A release build is smaller and faster (Hermes bytecode is precompiled, JS is minified), which matters if the tester is on a slow connection or older device:

```sh
cd android
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

This project's release build is currently signed with the same `debug.keystore` committed under `android/app/` (see `signingConfigs` in `android/app/build.gradle`) — so this command works with no extra setup. **That keystore is for testing distribution only; it must not be used to publish to the Play Store.** Before any real release, generate a dedicated upload keystore and update `signingConfigs.release` to use it.

Either build lands as a single universal APK covering all four supported architectures (`armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`), so it'll install on any tester's device without needing to pick the right variant.

## 3. Get the APK to the tester

Pick whichever is easiest:

- **Direct install over USB** (tester's device connected and USB debugging on):
  ```sh
  adb install -r android/app/build/outputs/apk/debug/app-debug.apk
  ```
- **File transfer**: send the `.apk` file itself (Drive, email, chat app, etc.) and have them open it on their device.

## 4. What the tester needs to do

1. If installing from a file (not `adb install`), Android will prompt to allow installs from that source (Settings → "Install unknown apps") — this is expected for any APK outside the Play Store.
2. On first launch, the app will ask for **All files access** — this is required for a file manager to browse arbitrary folders and isn't optional. It opens Android's system settings screen; the tester needs to toggle it on and return to the app.
3. That's it — no other setup is needed.

## Troubleshooting

- **"App not installed" on re-install**: happens if a previous install of `com.filemanager.app` was signed with a different keystore (e.g. switching between a debug build from Android Studio and one from this repo). Uninstall the existing app first, then re-install.
- **Build fails with an SDK/build-tools error**: run `./gradlew assembleDebug` once from `android/` interactively — Gradle will download whatever's missing (platform 36, build-tools 36.0.0) automatically, given a working internet connection.
- **Stale build after pulling new code**: run `cd android && ./gradlew clean` once, then rebuild.
