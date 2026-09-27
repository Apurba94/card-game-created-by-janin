# Android APK Build Status

The Android project was generated successfully with Expo prebuild on **August 13, 2026**. Two constrained local Gradle release builds were attempted. The final build reached Expo project configuration and stopped because this environment has no configured Android SDK (`ANDROID_HOME`/`sdk.dir`). No APK was emitted.

The repository contains a ready `eas.json` preview profile that requests an installable APK rather than an app bundle:

```bash
npx eas-cli build --platform android --profile preview
```

Run this command in a signed-in Expo build environment, or install an Android SDK locally, set `ANDROID_HOME`, and run:

```bash
cd android
./gradlew assembleRelease
```

The local Gradle output, once produced, will be located at `android/app/build/outputs/apk/release/`.
