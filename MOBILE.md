# NutriAI Mobile Build

NutriAI mobile is built with Capacitor so the iOS and Android apps reuse the same React/Vite UI as the web app.

## API URL

The mobile app needs a backend URL reachable from the phone. Create `.env.mobile` from `.env.mobile.example`:

```bash
VITE_API_BASE_URL=https://nutriai-rt1k.onrender.com
```

For emulator-only local testing:

```bash
# Android emulator
VITE_API_BASE_URL=http://10.0.2.2:4001

# iOS simulator
VITE_API_BASE_URL=http://localhost:4001
```

Real phones should use the deployed HTTPS backend. The current production API is:

```text
https://nutriai-rt1k.onrender.com
```

## Build And Sync

```bash
npm run mobile:build
```

This runs a production Vite build and syncs `dist/` into `android/` and `ios/`.

## Android

Requirements:

- Android Studio
- Android SDK
- `ANDROID_HOME` or `android/local.properties` with `sdk.dir=C:\\Users\\YOU\\AppData\\Local\\Android\\Sdk`

Commands:

```bash
npm run android:open
```

Or build debug APK:

```bash
cd android
gradlew.bat assembleDebug
```

The debug APK will be in:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## iOS

Requirements:

- macOS
- Xcode

Commands:

```bash
npm run ios:open
```

Then build/run from Xcode.

## Size Notes

Capacitor keeps the app lightweight by packaging the optimized web assets plus the native WebView shell. The Node/Express backend, PostgreSQL, and Gemini key are not bundled into the app.
