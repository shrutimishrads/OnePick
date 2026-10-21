# OnePick: Fire TV Build & Deployment Guide

This guide documents the exact setup and deployment procedures for running OnePick on **Fire OS** devices and Android TV emulators.

---

## 1. Architecture Overview
- **Client Wrapper (`fireos/`):** Native Android Leanback Activity hosting a hardware-accelerated `WebView` (`com.onepick.tv.MainActivity`).
- **Network Security (`network_security_config.xml`):** Scoped cleartext HTTP configuration permitting traffic to emulator host loopback (`10.0.2.2`), localhost, and private RFC 1918 LAN ranges.
- **Backend Server (`app/server.ts`):** Local Node.js server serving the 1080p Leanback UI, executing the deterministic Rawlsian scoring engine (`core/scoring.ts`), and handling Bedrock Converse API requests (`api/bedrock.ts`).
- **Remote Control Integration:** Native `onKeyDown` maps Fire TV remote hardware events (`KEYCODE_DPAD_UP`, `DOWN`, `LEFT`, `RIGHT`, `CENTER`, `BACK`, `PLAY_PAUSE`) directly to web DOM keyboard events.

---

## 2. Option A: Android TV Emulator Setup

This path runs the Leanback TV application inside an Android emulator on your workstation without physical TV hardware.

### Step 1: Start the Local OnePick Server
```bash
npm run tv
# Server starts at http://localhost:3000
```

### Step 2: Configure TV Virtual Device (AVD) in Android Studio
1. Open **Android Studio** -> **Virtual Device Manager** -> **Create Device**.
2. Category: Select **TV** -> **Television (1080p)** (1920x1080, 320 dpi).
3. System Image: Select **Android 9.0 (API 28)** or **Android 11.0 (API 30)** (matches Fire OS 7 and Fire OS 8).
4. Launch the emulator.

### Step 3: Run the Fire OS App
In Android Studio:
1. Open the `fireos/` directory.
2. Select target: `Television (1080p)`.
3. Click **Run 'app'** (`Shift + F10`).
*(Note: Android TV emulators automatically route `http://10.0.2.2:3000` to the host machine's `localhost:3000`).*

---

## 3. Option B: Physical Fire TV Stick (Sideload via Wireless ADB)

### Step 1: Enable Developer Options on Fire TV
1. On Fire TV: Go to **Settings** -> **My Fire TV** -> **About**.
2. Highlight your device name and press the **Center (Select) button 7 times** until the screen reads *"No need, you are already a developer"*.
3. Go back to **Settings** -> **My Fire TV** -> **Developer Options**.
4. Turn **ADB Debugging** to **ON**.
5. Turn **Apps from Unknown Sources** to **ON**.

### Step 2: Determine Network IP Addresses
1. **Fire TV IP:** On your TV, navigate to **Settings** -> **My Fire TV** -> **About** -> **Network** (e.g. `192.168.1.120`).
2. **Workstation LAN IP:** On your development computer terminal, run `ipconfig` (Windows) or `ifconfig` (macOS/Linux) to find your IPv4 address on the same Wi-Fi network (e.g. `192.168.1.50`).

### Step 3: Connect via Wireless ADB
From your development terminal:
```bash
adb connect 192.168.1.120:5555
# Confirm the authentication prompt on your TV screen using the Fire TV remote
adb devices
# Output should list: 192.168.1.120:5555 device
```

### Step 4: Start OnePick Server on Your LAN
```bash
npm run tv
```

### Step 5: Build and Sideload APK
```bash
cd fireos
# Build debug APK
./gradlew assembleDebug

# Install APK onto Fire TV
adb -s 192.168.1.120:5555 install -r app/build/outputs/apk/debug/app-debug.apk

# Launch with your workstation IP passed via intent extra:
adb -s 192.168.1.120:5555 shell am start -n com.onepick.tv/.MainActivity --es url "http://192.168.1.50:3000"
```

---

## 4. Option C: Rapid 10-Foot Browser Simulator (Zero SDK Required)
For instant evaluation and demo recording on your laptop without an Android SDK:
```bash
npm run tv
```
Open **[http://localhost:3000](http://localhost:3000)** in Chrome or Edge, press `F11` for 1080p fullscreen, and use Arrow keys and Enter to simulate Fire TV remote navigation.

---

## 5. What Blocks `./gradlew assembleDebug` Once JDK 17 & Android SDK Exist

Once a reviewer has installed JDK 17 and Android SDK cmdline-tools, the following items must still be addressed before `./gradlew assembleDebug` succeeds:

1. **Missing `gradlew` / `gradlew.bat` Executable Wrapper Scripts:**
   - **Reason:** The `fireos/` directory contains `gradle/wrapper/gradle-wrapper.properties`, but does not commit the `gradlew` shell script, `gradlew.bat` batch script, or `gradle-wrapper.jar` binary.
   - **Resolution:** Run `gradle wrapper` once using any system Gradle installation (or open `fireos/` in Android Studio, which generates them automatically upon initial project sync).

2. **Android SDK Platform 34 & Build-Tools 34.0.0:**
   - **Reason:** `fireos/app/build.gradle` specifies `compileSdk 34` and `targetSdk 34`.
   - **Resolution:** Install the matching API platform:
     ```bash
     sdkmanager "platforms;android-34" "build-tools;34.0.0"
     ```

3. **Android SDK License Acceptance:**
   - **Reason:** Fresh SDK installations block build execution until SDK licenses are accepted.
   - **Resolution:**
     ```bash
     sdkmanager --licenses
     ```
