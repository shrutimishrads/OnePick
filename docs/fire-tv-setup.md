# OnePick: Fire TV Build & Deployment Guide

This guide documents the intended deployment routes for building, deploying, and demonstrating OnePick on **Fire OS** devices and Android TV emulators.

---

## 1. Architecture Overview
- **Client:** Fire OS Native Android Leanback Activity (`fireos/`) hosting a fullscreen WebView (`com.onepick.tv.MainActivity`).
- **Backend & Logic:** Node.js HTTP server (`app/server.ts`) serving the 10-foot UI, calculating Rawlsian group scores (`core/scoring.ts`), and handling Bedrock Converse API requests (`api/bedrock.ts`).
- **Remote Control Integration:** Android `onKeyDown` maps Fire TV remote hardware events (`KEYCODE_DPAD_UP`, `DOWN`, `LEFT`, `RIGHT`, `CENTER`, `BACK`, `PLAY_PAUSE`) directly to web key events.

---

## 2. Option A: Android Studio TV Emulator (Intended Local Path)
This path allows running the Leanback TV application inside an emulator without physical TV hardware.

### Step 1: Open in Android Studio
1. Launch **Android Studio**.
2. Select **Open** and select the `fireos/` directory.
3. Allow Gradle sync to complete.

### Step 2: Configure a TV Virtual Device (AVD)
1. Open **Device Manager** -> **Create Device**.
2. Select **TV** -> **Television (1080p)**.
3. Select an image: **Android 9.0 (API 28)** or **Android 11.0 (API 30)** (matches Fire OS 7 and Fire OS 8).
4. Finish and launch the emulator.

### Step 3: Start the OnePick Server & Run App
1. In your project root terminal, start the server:
```bash
npm run tv
# Server listens on port 3000
```
2. In Android Studio, click **Run 'app'** targeting the TV emulator.
*(Note: Android TV emulators automatically route `http://10.0.2.2:3000` to the host PC's `localhost:3000`).*

---

## 3. Option B: Physical Fire TV Stick (Sideload via ADB)

### Step 1: Enable Developer Options on Fire TV
1. On Fire TV: **Settings** -> **My Fire TV** -> **About**.
2. Highlight device name and press the **Center button 7 times** until developer mode is unlocked.
3. Go back to **Developer Options** and enable **ADB Debugging** and **Apps from Unknown Sources**.

### Step 2: Connect via ADB over Local Wi-Fi
1. Find your Fire TV IP address under **Settings** -> **My Fire TV** -> **About** -> **Network**.
2. Connect from your terminal:
```bash
adb connect <FIRE_TV_IP>:5555
```

### Step 3: Start Node Server with Host Network IP
Find your PC local IP (e.g. `192.168.1.50`) via `ipconfig`.
```bash
PORT=3000 npm run tv
```

### Step 4: Install and Launch
```bash
cd fireos
.\gradlew assembleDebug
adb -s <FIRE_TV_IP>:5555 install -r app/build/outputs/apk/debug/app-debug.apk
adb -s <FIRE_TV_IP>:5555 shell am start -n com.onepick.tv/.MainActivity -e url "http://192.168.1.50:3000"
```

---

## 4. Option C: Local 10-Foot Browser Simulator (Development & UI Testing)
For rapid UI iteration and testing on your development laptop without an Android build:
```bash
npm run tv
```
Open **[http://localhost:3000](http://localhost:3000)** in Chrome/Edge, toggle fullscreen (`F11`), and navigate using keyboard arrow keys and Enter.
