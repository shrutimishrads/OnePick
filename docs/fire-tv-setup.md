# OnePick: Fire TV Build & Deployment Guide

This guide documents the tested paths for building, deploying, and demonstrating OnePick on **Fire OS** and **Android TV / Fire TV Emulators** on Windows.

---

## 1. Architecture Overview
- **UI & Logic:** 10-foot TV HTML5/TypeScript application served by Node.js (`npm run tv`).
- **Fire OS Wrapper (`fireos/`):** Native Android Leanback Activity (`com.onepick.tv.MainActivity`) configured for television displays (`android.software.leanback`).
- **Remote Control Integration:** Maps Fire TV remote hardware events (`KEYCODE_DPAD_UP`, `DOWN`, `LEFT`, `RIGHT`, `CENTER`, `BACK`, `PLAY_PAUSE`) directly to the television spatial focus engine.

---

## 2. Option A: Android Studio TV Emulator (Recommended on Windows)
This path requires **no physical television** and avoids the hypervisor conflicts often encountered with the Vega Virtual Device inside WSL2.

### Step 1: Create a TV Virtual Device (AVD)
1. Open **Android Studio** -> **Virtual Device Manager** (Device Manager).
2. Click **Create Device**.
3. Select **TV** from the category list. Choose **Television (1080p)**.
4. Select a system image: **Android 9.0 (Pie - API 28)** or **Android 11.0 (API 30)** (matches Fire OS 7 and Fire OS 8).
5. Finish creation and click **Launch (Play)** to boot the TV emulator.

### Step 2: Start the OnePick Backend
In your terminal, start the local server:
```bash
npm run tv
# Server starts at http://localhost:3000
```
*(Note: Android TV emulator automatically maps `http://10.0.2.2:3000` to your host machine's `localhost:3000`).*

### Step 3: Build & Deploy the Fire OS Wrapper
```bash
cd fireos
# On Windows PowerShell:
.\gradlew assembleDebug

# Install onto the running emulator:
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Launch the app on the TV emulator:
adb shell am start -n com.onepick.tv/.MainActivity
```
The OnePick application launches inside the TV emulator, responding to the emulator's D-pad remote controller and computer keyboard arrow keys.

---

## 3. Option B: Physical Fire TV Stick (Sideload via ADB)

### Step 1: Enable Developer Mode on Fire TV
1. Turn on your Fire TV Stick.
2. Go to **Settings** -> **My Fire TV** -> **About**.
3. Highlight your device name and click the remote **Center button 7 times** until a prompt says *"You are now a developer!"*
4. Go back one screen to **Developer Options**.
5. Enable **ADB Debugging** and **Apps from Unknown Sources**.

### Step 2: Connect via ADB over Local Wi-Fi
1. Find your Fire TV IP address: **Settings** -> **My Fire TV** -> **About** -> **Network**.
2. On your Windows development machine (connected to the same Wi-Fi network):
```bash
adb connect <FIRE_TV_IP>:5555
# Confirm the authorization prompt on your TV screen with the remote
```

### Step 3: Start OnePick with Host IP
Find your PC's local network IP (e.g. `192.168.1.50`) using `ipconfig`.
Start the OnePick server:
```bash
PORT=3000 npm run tv
```

### Step 4: Install and Launch with Target IP
```bash
cd fireos
.\gradlew assembleDebug
adb -s <FIRE_TV_IP>:5555 install -r app/build/outputs/apk/debug/app-debug.apk
adb -s <FIRE_TV_IP>:5555 shell am start -n com.onepick.tv/.MainActivity -e url "http://192.168.1.50:3000"
```

---

## 4. Option C: Local 10-Foot Browser Simulator (Fast Development)
For rapid testing without launching an Android emulator:
```bash
npm run tv
```
Open **[http://localhost:3000](http://localhost:3000)** in Chrome/Edge, press `F11` for fullscreen, and navigate using keyboard arrow keys and Enter.
