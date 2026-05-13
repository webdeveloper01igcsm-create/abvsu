# APK / AAB Build Guide (No Expo Go)

## 1) One-time prerequisites

- Install Node.js LTS and run `npm install` in this folder.
- Install Android Studio + Android SDK + platform tools.
- Install JDK 17.
- Ensure `adb` works from terminal.

## 2) Configure API URL per environment

- Copy `.env.example` to `.env` for local/lab builds.
- Set:
  - `EXPO_PUBLIC_API_BASE_URL=http://<your-backend-ip>:5005/` for LAN testing
  - `EXPO_PUBLIC_API_BASE_URL=https://api.sikkimglobaltechnicaluniversity.co.in/` for server/prod

## 3) Local APK builds (Gradle)

From project root (`NewSGTUApp-main`):

- Debug APK:
  - `npm run android:apk:debug`
  - Output: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK:
  - `npm run android:apk:release`
  - Output: `android/app/build/outputs/apk/release/app-release.apk`
- Release AAB:
  - `npm run android:aab:release`
  - Output: `android/app/build/outputs/bundle/release/app-release.aab`

Install on connected device:

- `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`

## 4) Release signing setup (required for production)

Currently, release falls back to debug signing if no keystore is configured.

Set up real signing:

1. Create/obtain release keystore (`.jks`).
2. Copy `android/keystore.properties.example` to `android/keystore.properties`.
3. Fill values:
   - `storeFile`
   - `storePassword`
   - `keyAlias`
   - `keyPassword`
4. Keep `keystore.properties` and `.jks` out of git.

## 5) EAS cloud builds (server / CI fallback)

- APK (internal testing):
  - `npm run eas:apk`
- AAB (Play Store / production):
  - `npm run eas:aab`

Profiles are defined in `eas.json`:

- `development` (dev client)
- `preview` (APK)
- `production` (AAB)

## 6) Local test checklist before server rollout

- Login works against selected API.
- Student services apply/status works.
- Payment opens and returns correctly.
- Undertaking and license gating works.
- Notifications and file downloads work.

## 7) Server rollout checklist

- Build with production API base URL.
- Use release keystore signing.
- Upload AAB to Play Console (if store release).
- Share APK only for internal QA distribution.
