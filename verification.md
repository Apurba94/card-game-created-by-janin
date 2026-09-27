# Verification Notes

## 2026-08-12 — Command Lobby

The live web preview successfully exposed the command-lobby content: **Shethil**, local training status, operator callsign, match/win/best-placement statistics, the Solo Training operations card, expandable loadout, and the Deploy action. The preview service was restarted after rapid source changes before this check.

## Android Packaging Environment

The sandbox contains Java 21 but no Android SDK, `ANDROID_HOME`, Gradle executable, or Android platform tools. Android prebuild completed successfully and generated the `android/` project. Two controlled `assembleRelease` attempts—first at the generated 2 GB memory setting, then at a restricted 512 MB / single-worker setting—ended when the Gradle daemon disappeared before compilation. No APK was emitted. A local Android SDK/build host or configured cloud Android build service is required to produce the APK.
