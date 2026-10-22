# Product Feedback for Amazon Developer & AWS Teams
> **Hackathon Submission Component:** *Build, Ship, Shape: Amazon Developer Hackathon 2026*  
> **Team:** OnePick

---

## 1. Fire TV & Fire OS Developer Tooling Friction Log

### Architecture Used
- HTML5/TypeScript 10-foot TV UI served by local Node.js (`app/server.ts`).
- Native Android Leanback wrapper project (`fireos/`) targeting Fire OS, mapping Fire TV hardware remote keycodes (`KEYCODE_DPAD_*`, `KEYCODE_ENTER`, `KEYCODE_BACK`) to web key events.

### Friction Log Entries

#### Entry 1: Android TV Emulator Setup & Build Tooling
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

#### Entry 3: 10-Foot Spatial Navigation & Display Scaling in Android TV WebView
- **Task attempted:** Verify WebView display scaling, remote key navigation, and back-button lifecycle in the Fire OS / Leanback container.
- **Steps:**
  1. Loaded 10-foot web UI into `MainActivity` WebView on Android TV emulator at 1080p (320dpi).
  2. Dispatched hardware D-pad navigation key events (`KEYCODE_DPAD_DOWN`, `KEYCODE_ENTER`, `KEYCODE_BACK`).
- **Expected vs actual:**
  - *Expected:* Web UI scales 1:1 to 1080p without layout distortion or canvas clipping.
  - *Actual:* At 320dpi (2.0x density), the Android WebView reported `window.innerWidth: 960` instead of 1920 CSS pixels. Because the web UI included a responsive auto-scaler designed for browser viewports, it computed `scale = 0.5` inside an already density-scaled WebView, causing the UI to shrink and offset. As a precaution for reliable D-pad navigation, `MainActivity.java` was also updated to intercept key events via `dispatchKeyEvent(KeyEvent event)` to ensure top-level remote event dispatch before child view consumption.
- **Severity:** Medium
- **Workaround:** Added wrapper-level CSS positioning (`transform-origin: top left; position: absolute; top: 0; left: 0;`) inside `onPageFinished` to preserve 1080p alignment, and implemented `dispatchKeyEvent` as an architectural precaution.
- **Suggestion:** Provide official documentation and boilerplate for Fire TV / Android TV WebViews clarifying viewport density reporting (e.g. 320dpi on 1080p panels) and recommended key dispatch patterns.

#### Entry 4: TV Remote Key Event Interception during Native Text Input Dialogs (`onJsPrompt`)
- **Task attempted:** Type and submit natural language refinement constraints via the TV remote/keyboard through the TV text refinement dialog (`window.prompt()`).
- **Steps:**
  1. Opened "Voice-style Refine (Text)" dialog in the WebView, triggering `WebChromeClient.onJsPrompt`.
  2. Typed refinement string into the `AlertDialog` `EditText` via D-pad / virtual keyboard / ADB input text.
  3. Pressed Enter (`KEYCODE_ENTER` / `KEYCODE_DPAD_CENTER`) on the TV remote to confirm input.
- **Expected vs actual:**
  - *Expected:* Pressing Enter confirms the prompt result (`JsPromptResult.confirm()`) and dismisses the dialog with the entered text.
  - *Actual:* Activity-level `dispatchKeyEvent` override (which was set up to route hardware remote keys into the WebView) unconditionally intercepted `KEYCODE_ENTER` before the `AlertDialog` received it, and forwarded Enter into the underlying `WebView` (clicking whatever button was focused behind the dialog, resetting the screen to the viewers screen while the dialog remained stuck open). Furthermore, the default `EditText` did not handle IME action `DONE` or Enter key events to dismiss the dialog. (Note: earlier statements claiming text input was verified before this fix were incomplete/inaccurate because remote/Enter submission was broken).
- **Severity:** Medium
- **Workaround:** Added `volatile boolean mIsPromptDialogOpen` flag so `dispatchKeyEvent` delegates directly to `super.dispatchKeyEvent(event)` while the dialog is visible, and attached an `OnEditorActionListener` to the `EditText` to call `result.confirm(...)` and `dialog.dismiss()` on Enter / Done (commit `da2d7d9`). Time lost: ~20 mins.
- **Suggestion:** Leanback WebView documentation should demonstrate the standard pattern for yielding Activity-level remote key event interception when modal child dialogs or system IMEs are visible.

---

## 2. AWS Bedrock & Converse API Friction Log

### Architecture Used
- `@aws-sdk/client-bedrock-runtime` using unified `ConverseCommand`.
- Standardized Model: `amazon.nova-lite-v1:0` (configured via `BEDROCK_MODEL_ID`).
- Regional endpoint via `AWS_REGION` using standard AWS credential provider chain.
- Strict client-side JSON sanitization, configurable timeout budget (`BEDROCK_TIMEOUT_MS`, default 3000ms), in-memory caching, and local deterministic fallback.

### Friction Log Entries

#### Entry 5: Structured Output JSON Enforcement in Converse API
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

#### Entry 6: Live Bedrock Invocations on AWS Free-Plan Account
- **Task attempted:** Call Amazon Nova Lite through the Bedrock Converse API from a new Free-plan account (Thursday 22 Oct 2026, roughly 08:40 to 09:00 IST, ~30 to 40 minutes lost, Bedrock console).
- **Steps:**
  1. Opened Bedrock console / Playground in `us-east-1` to test model access.
  2. Encountered region lock: console showed *"Region United States (N. Virginia) unavailable. Your project is assigned to Asia Pacific (Sydney) ap-southeast-2... To access other commercial AWS Regions, upgrade your plan first, then activate advanced features."*
  3. Observed a red banner showing the assumed role *"is not authorized to perform: bedrock:GetUseCaseForModelAccess with an explicit deny in a service control policy"* (`[redacted-account-id]`, `[redacted-role-arn]`, `[redacted-policy-arn]`).
  4. Switched to assigned region `ap-southeast-2` (Sydney), where Nova Lite 1.0, Nova Micro, Nova Pro, and Nova 2 Lite were listed.
  5. Sent first message to Nova Lite; received `AccessDeniedException`: *"Your account is currently being verified. Verification normally takes less than 2 hours. Until your account is verified, you may not have access to this operation."*
  6. Retried a few minutes later across all listed models (Nova Lite, Nova Micro, Nova Pro, Nova 2 Lite).
- **Expected vs actual:**
  - *Expected:* Successful live invocation of Amazon Nova Lite via the Bedrock Converse API to measure round-trip latency and parse test utterances.
  - *Actual:* Every model returned `ThrottlingException`: *"Too many tokens per day, please wait before trying again."* on the very first message. The daily token quota appears to be zero on a new Free-plan account. No live Bedrock call succeeded, blocking live cloud integration.
- **Severity:** High (blocked live Bedrock integration).
- **Workaround:** Kept the deterministic fallback, maintained an honest status table documenting that live Bedrock calls were unverified due to Free-plan quotas, and dropped the AWS Builder mini challenge.
- **Suggestion:** Show the Free-plan region lock and zero Bedrock quota at signup or in the Bedrock console before users build against it, and make the "account being verified" and throttling messages say what the quota is and how to raise it.
