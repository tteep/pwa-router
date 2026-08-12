# Gatsby Router — Build, Signing & Validation Guide

## Package ID
`com.gatsbyrouter.app`

## Signing Method
EAS-managed Android credentials (automatic keystore generation).
No Google Play Developer account required.
No keystore committed to source control.

## Build the Signed APK

```bash
# Install EAS CLI if needed
npm install -g eas-cli

# Log in to your Expo account
eas login

# Build signed APK (sideloadable, no Play Store required)
eas build --platform android --profile router
```

EAS automatically generates and manages the Android keystore.
The signed APK will be available for download from the EAS dashboard.

## Install on Device

```bash
# Enable "Install from unknown sources" on your Android device first
# Then either:

# Option A — ADB
adb install GatsbyRouter-release.apk

# Option B — direct download
# Download from EAS dashboard and open on device
```

## Verify Signature

```bash
# Using apksigner (from Android SDK build-tools)
apksigner verify --verbose GatsbyRouter-release.apk

# Expected output includes:
# Verified using v1 scheme (JAR signing): true  (or false)
# Verified using v2 scheme (APK Signature Scheme v2): true
# Verified using v3 scheme (APK Signature Scheme v3): true

# Using keytool
keytool -printcert -jarfile GatsbyRouter-release.apk
```

## Test Intent Filters via ADB

After installing the APK, run these ADB commands to verify Android recognises Gatsby Router's intent filters.

### HTTP / HTTPS
```bash
adb shell am start -a android.intent.action.VIEW -d "https://example.com" -c android.intent.category.BROWSABLE
```

### mailto:
```bash
adb shell am start -a android.intent.action.SENDTO -d "mailto:test@example.com"
```

### tel:
```bash
adb shell am start -a android.intent.action.DIAL -d "tel:+1234567890"
```

### geo:
```bash
adb shell am start -a android.intent.action.VIEW -d "geo:37.7749,-122.4194"
```

### Share (text)
```bash
adb shell am start -a android.intent.action.SEND --es android.intent.extra.TEXT "Hello from share" -t text/plain
```

### Verify intent resolution (lists all handlers)
```bash
# Check which apps handle mailto:
adb shell cmd package query-activities -a android.intent.action.SENDTO -d mailto:test@example.com

# Check which apps handle https:
adb shell cmd package query-activities -a android.intent.action.VIEW -d https://example.com -c android.intent.category.BROWSABLE
```

## Set as Default App

1. Install the signed APK on your Android device
2. Go to **Settings → Apps → Default apps**
3. Set **Gatsby Router** as default for:
   - Browser (handles http/https)
   - Email (handles mailto:)
4. For Phone/Maps, tap the intent in another app — Android will show a chooser where you can select Gatsby Router and tap "Always"

## Notes

- Intent filters only work in a **standalone signed build** — not in Expo Go
- `autoVerify` is set to `false` for http/https — this means Android will always show the chooser for web links rather than silently routing to Gatsby Router. To enable silent routing, host `/.well-known/assetlinks.json` on your domain with your app's SHA-256 signing fingerprint
- The `router` EAS profile uses `distribution: internal` — no Play Store account needed
