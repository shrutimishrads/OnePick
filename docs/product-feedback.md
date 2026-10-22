# Product Feedback for Amazon Developer & AWS Teams
> **Hackathon Submission Component:** *Build, Ship, Shape: Amazon Developer Hackathon 2026*  
> **Team:** OnePick

---

## 1. Fire TV & Fire OS Developer Tooling Friction Log

### Architecture Used
- HTML5/TypeScript 10-foot TV UI served by local Node.js (`app/server.ts`).
- Native Android Leanback wrapper project (`fireos/`) targeting Fire OS, mapping Fire TV hardware remote keycodes (`KEYCODE_DPAD_*`, `KEYCODE_ENTER`, `KEYCODE_BACK`) to web key events.

### Friction Log Entries

#### Entry 1: Fire TV Emulator Setup & Build Tooling
- **Task attempted:** Build and launch the Fire OS Leanback wrapper (`fireos/`) inside Android Studio's Android TV emulator on a Windows 11 workstation.
- **Steps:**
  1. Installed Android Studio and invoked SDK setup wizard.
  2. Built debug APK via `./gradlew.bat assembleDebug` using Gradle 8.7 and OpenJDK 17.
  3. Launched `OnePick_TV` AVD (`system-images;android-34;android-tv;x86`) and installed APK.
- **Expected vs actual:**
  - *Expected:* Clean setup wizard run and immediate boot into fullscreen Leanback app.
  - *Actual:* Setup wizard threw `java.net.SocketTimeoutException: Read timed out` on default phone image (`sys-img/google_apis_playstore/x86_64-37.0_r06.zip`). Furthermore, on first cold boot, Android TV displayed a modal dialog ("Buy and rent movies on your TV") covering the app window.
- **Severity:** Medium
- **Workaround:** Canceled the phone image download, used `sdkmanager` CLI to install `system-images;android-34;android-tv;x86` and API 34 components directly, and sent `adb shell input keyevent 4` to dismiss the initial system dialog.
- **Suggestion:** Provide streamlined, lightweight Fire TV / Android TV system image packages separate from the full multi-gigabyte phone Play Store images.

#### Entry 2: Physical Fire TV Sideloading & Hardware Remote Testing
- **Status:** [TODO: human] Verified on Android TV emulator (1080p, API 34). Physical device sideloading and Alexa remote testing to be logged if tested on hardware.

#### Entry 3: 10-Foot Spatial Focus & WebView Key Repeat on Fire OS
- **Task attempted:** Verify WebView focus handling, remote key repeats, and back-button lifecycle in the Fire OS Leanback container.
- **Steps:**
  1. Loaded 10-foot web UI into `MainActivity` WebView on Android TV emulator at 1080p (320dpi).
  2. Dispatched hardware D-pad navigation key events (`KEYCODE_DPAD_DOWN`, `KEYCODE_ENTER`, `KEYCODE_BACK`).
- **Expected vs actual:**
  - *Expected:* Web UI scales 1:1 to 1080p and remote key events are received by `Activity.onKeyDown`.
  - *Actual:* Two issues observed:
    1. At 320dpi (2.0x density), WebView reported `window.innerWidth: 960` instead of 1920 CSS pixels, causing the viewport auto-scaler in `index.html` to compute `scale = 0.5` inside an already-zoomed WebView, offsetting the container. Fixed in `MainActivity.java` by aligning canvas to `top left`.
    2. Child WebView consumed D-pad and Enter key events, preventing `onKeyDown` from firing. Fixed in `MainActivity.java` by overriding `dispatchKeyEvent(KeyEvent event)` to intercept `ACTION_DOWN` D-pad and Enter keys before WebView consumption.
- **Severity:** Medium
- **Workaround:** Added wrapper-level CSS canvas positioning in `onPageFinished` and intercepted hardware remote keys in `dispatchKeyEvent`.
- **Suggestion:** Provide an official Amazon Fire TV Leanback WebView template repository demonstrating correct hardware remote event interception and 1080p density scaling.

---

## 2. AWS Bedrock & Converse API Friction Log

### Architecture Used
- `@aws-sdk/client-bedrock-runtime` using unified `ConverseCommand`.
- Standardized Model: `amazon.nova-lite-v1:0` (configured via `BEDROCK_MODEL_ID`).
- Regional endpoint via `AWS_REGION` using standard AWS credential provider chain.
- Strict client-side JSON sanitization, configurable timeout budget (`BEDROCK_TIMEOUT_MS`, default 3000ms), in-memory caching, and local deterministic fallback.

### Friction Log Entries

#### Entry 4: Structured Output JSON Enforcement in Converse API
- **Task attempted:** Parse unstructured user utterances into strict JSON constraint patches (`ConstraintPatch`) using the Converse API.
- **Steps:**
  1. Configured `ConverseCommand` with system prompt demanding raw JSON output without markdown fences.
  2. Sent natural language utterance with current constraint context to `amazon.nova-lite-v1:0`.
  3. Inspected raw text response from Bedrock runtime.
- **Expected vs actual:**
  - *Expected:* A native inference configuration parameter guaranteeing strict JSON output complying with a provided schema.
  - *Actual:* Models may occasionally wrap JSON in markdown code blocks (` ```json ... ``` `) or append conversational commentary, requiring custom regex stripping and fallback sanitizers.
- **Severity:** Medium
- **Workaround:** Implemented regex fence stripping and strict client-side sanitization (`sanitizeConstraintPatch`) that drops unknown keys and bounds numeric values.
- **Suggestion:** Provide native JSON schema enforcement mode (similar to tool use schema validation) directly in the Converse API inference configuration.

#### Entry 5: Live Model Cold-Start and TV Latency Budget
- **Task attempted:** Measure cold-start and warm round-trip latency of `amazon.nova-lite-v1:0` under a 10-foot living room interaction budget.
- **Steps:**
  1. [TODO: Add steps once live AWS credentials are authenticated in testing environment]
  2. [TODO: Execute un-cached parse and explain calls and record exact millisecond timings via `npm run bedrock:check`]
- **Expected vs actual:**
  - *Expected:* [TODO: Record expected response latency for TV interaction (e.g. < 1,500 ms)]
  - *Actual:* [TODO: Record actual cold-start handshake and warm round-trip latency measured via `npm run bedrock:check`]
- **Severity:** [TODO: Low / Medium / High]
- **Workaround:** Implemented a non-blocking `warmupBedrock()` routine, in-memory caching for repeated queries, and deterministic local fallbacks with configurable timeout (`BEDROCK_TIMEOUT_MS`).
- **Suggestion:** Provide pre-warmed connection guidance or edge streaming token utilities tailored for TV frontends.
