# Devpost Submission Text: OnePick

### Project Title
**OnePick**

### Tagline (Elevator Pitch)
*An AI household viewing concierge on Fire TV that quickly resolves group couch debates using Rawlsian fairness, with Amazon Bedrock integration and a deterministic local fallback.*

### Tracks & Challenges
- **Primary Track:** Fire TV (Sub-category: *AI-enhanced viewing* / *Family entertainment*)
- **Mini-Challenge:** AWS Builder Mini Challenge

---

### Inspiration
Every evening in millions of households, friends and families sit on the couch and often spend a long time deciding, aimlessly scrolling streaming carousels because no single person can agree on what to watch. Traditional recommendation algorithms are fundamentally broken for living rooms: they personalize strictly for a single user profile, leading to compromises where someone is always unhappy. We built **OnePick** to turn decision fatigue into a shared household consensus quickly.

---

### What It Does
OnePick is a 10-foot Fire TV application that:
1. **Activates Household Profiles:** Quickly toggles who is sitting on the couch via D-pad remote navigation, gathering individual likes, runtime limits, and hard dealbreakers (e.g. no horror).
2. **Computes Rawlsian Max-Min Consensus:** Rather than a simple majority vote (which leaves minority tastes steamrolled), our deterministic fairness engine maximizes the satisfaction of the least-satisfied viewer.
3. **Conversational Constraint Patching:** Uses the **Amazon Bedrock Converse API** to interpret voice-style refine (text input) (*"We saw that last week"*, *"Shruti has an early meeting, keep it under 100 minutes"*) into structured JSON patches without losing state.
4. **Transparent Consensus AI:** Explains *why* the title was picked in plain English, explaining compromises and keeping everyone happy before hitting play.

---

### How We Built It
- **Architecture & Runtimes:** The system uses a clean client-server architecture:
  - **Fire OS Client (`fireos/`):** A native Android Leanback WebView wrapper configured for Fire TV, mapping remote D-pad controls (`KEYCODE_DPAD_*`, `KEYCODE_ENTER`, `KEYCODE_BACK`) and bridging Back button events to web modal states.
  - **Node.js Application Server (`app/server.ts`):** Serves the 10-foot TV web client, executes the deterministic scoring engine, and communicates with AWS Bedrock via standard AWS SDK credential chains.
- **10-Foot TV UI (`app/index.html`):** Built with overscan-safe margins, large typography (28px+ body), spatial keyboard navigation, on-screen remote simulation, and accessible focus outlines.
- **Deterministic Core (`core/`):** Written in pure TypeScript with zero external dependencies, providing unit-tested Rawlsian max-min fairness ranking, group scoring, and constraint satisfaction.
- **AWS Bedrock Integration (`api/bedrock.ts`):** Employs the Amazon Bedrock Converse API (`@aws-sdk/client-bedrock-runtime`, standardized on `amazon.nova-lite-v1:0`) for natural language constraint parsing and natural explanation generation, bounded by configurable timeouts, response caching, strict JSON schema validation, and deterministic fallbacks. Amazon Bedrock (Nova Lite via the Converse API) is integrated with a deterministic fallback; a live Bedrock call could not be verified because the Free-plan account returned a daily-token throttling error on all models.
- **Curated Living Room Library:** Exactly 20 original titles with detailed metadata, genre weights, mood tags, and runtime constraints.

---

### Challenges We Ran Into
- **10-Foot Spatial Focus & Remote Navigation:** Designing for a TV interface without a mouse or touch gestures requires deliberate focus management. We built an on-screen TV remote simulator and keyboard arrow key navigation in the web app, and designed the native Fire OS wrapper (`MainActivity.java`) to intercept D-pad and Back button events.
- **Predictable Television Response Times:** Living room users expect immediate feedback. Relying on an LLM to generate candidate recommendations risks hallucinations and latency spikes. We solved this by using AWS Bedrock strictly for structured constraint extraction and explanation, keeping candidate ranking completely deterministic in TypeScript.

---

### Accomplishments That We're Proud Of
- Designing a fair group aggregation formula that prioritizes lifting the satisfaction floor of the lowest-scoring viewer.
- Building a full 10-foot TV interface with keyboard and on-screen remote simulation, alongside an Android WebView wrapper project configured for Fire OS.
- Automated unit test suite covering constraint filtering, watched history exclusions, Bedrock JSON sanitization, and fairness ranking.
- Diagnostic tooling (`npm run bedrock:check`) that validates live AWS connectivity safely without exposing credentials.

---

### What We Learned
- Designing for a 10-foot television interface demands completely different UX paradigms than desktop or mobile apps: focus clarity, contrast, and remote navigation speed are paramount.
- How to effectively combine deterministic rule engines with generative AI: preventing generative hallucinations by keeping scoring strictly grounded in deterministic rules, using LLMs only for semantic parsing and natural explanations.

---

### Product Feedback & Friction Log
*(Full friction log with observations provided in `docs/product-feedback.md`)*

#### Entry 1: Android TV Emulator Setup & Tooling
- **Task Attempted:** Build and run the Fire OS Leanback wrapper (`fireos/`) in an Android TV 1080p emulator on Windows 11.
- **Steps:**
  1. Created `OnePick_TV` AVD targeting Android 14 (API 34) at 1080p using `avdmanager`.
  2. Built Leanback debug APK with Gradle 8.7 and Microsoft OpenJDK 17 (`./gradlew.bat assembleDebug`).
  3. Installed and launched app via ADB (`adb install -r app-debug.apk` and `adb shell am start -n com.onepick.tv/.MainActivity`).
- **Expected vs Actual:**
  - *Expected:* Smooth setup wizard completion and immediate full-screen 10-foot rendering.
  - *Actual:* Setup wizard stalled on optional phone image with `java.net.SocketTimeoutException: Read timed out` (resolved by canceling phone image and installing `system-images;android-34;android-tv;x86` directly via `sdkmanager`). Additionally, cold boot displayed an unprompted launcher overlay ("Buy and rent movies on your TV") which required sending remote keyevent BACK (`adb shell input keyevent 4`) to dismiss.
- **Severity:** Medium
- **Workaround:** Bypassed default phone images via CLI `sdkmanager`, and automated dismissal of initial setup dialogs.
- **Suggestion:** Provide pre-configured Amazon Fire TV AVD definitions directly in the Android SDK / SDK Manager tools for one-click setup.

#### Entry 2: Physical Fire TV Sideloading & Hardware Remote Testing
- **Status:** [TODO: human] Verified on Android TV emulator (1080p, API 34). Physical device sideloading and Alexa remote testing to be logged if tested on hardware.

#### Entry 3: TV Remote Key Event Interception during Native Text Input Dialogs (`onJsPrompt`)
- **Task Attempted:** Type and submit natural language refinement constraints via the TV remote/keyboard through the TV text refinement dialog (`window.prompt()`).
- **Steps:**
  1. Opened "Voice-style Refine (Text)" dialog in the WebView, triggering `WebChromeClient.onJsPrompt`.
  2. Typed refinement string into the `AlertDialog` `EditText` via D-pad / virtual keyboard / ADB input text.
  3. Pressed Enter (`KEYCODE_ENTER` / `KEYCODE_DPAD_CENTER`) on the TV remote to confirm input.
- **Expected vs Actual:**
  - *Expected:* Pressing Enter confirms the prompt result (`JsPromptResult.confirm()`) and dismisses the dialog with the entered text.
  - *Actual:* Activity-level `dispatchKeyEvent` override (which was set up to route hardware remote keys into the WebView) unconditionally intercepted `KEYCODE_ENTER` before the `AlertDialog` received it, and forwarded Enter into the underlying `WebView` (clicking whatever button was focused behind the dialog, resetting the screen to the viewers screen while the dialog remained stuck open). Furthermore, the default `EditText` did not handle IME action `DONE` or Enter key events to dismiss the dialog. (Note: earlier statements claiming text input was verified before this fix were incomplete/inaccurate because remote/Enter submission was broken).
- **Severity:** Medium
- **Workaround:** Added `volatile boolean mIsPromptDialogOpen` flag so `dispatchKeyEvent` delegates directly to `super.dispatchKeyEvent(event)` while the dialog is visible, and attached an `OnEditorActionListener` to the `EditText` to call `result.confirm(...)` and `dialog.dismiss()` on Enter / Done (commit `da2d7d9`). Time lost: ~20 mins.
- **Suggestion:** Leanback WebView documentation should demonstrate the standard pattern for yielding Activity-level remote key event interception when modal child dialogs or system IMEs are visible.

#### Entry 4: Structured Output JSON Enforcement in AWS Bedrock Converse API
- **Task Attempted:** Parse unstructured user utterances into strict JSON constraint patches (`ConstraintPatch`) using the Converse API (`amazon.nova-lite-v1:0`).
- **Steps:**
  1. Configured `ConverseCommand` with system prompt requesting raw JSON output without markdown fences.
  2. Sent natural language utterance with current constraint context to `amazon.nova-lite-v1:0`.
  3. Inspected raw text response from Bedrock runtime.
- **Expected vs Actual:**
  - *Expected:* A native inference configuration parameter guaranteeing strict JSON output complying with a provided schema.
  - *Actual:* Models may occasionally wrap JSON in markdown code blocks (` ```json ... ``` `) or append conversational commentary, requiring custom regex stripping and fallback sanitizers.
- **Severity:** Medium
- **Workaround:** Implemented regex fence stripping and strict client-side sanitization (`sanitizeConstraintPatch`) that drops unknown keys and bounds numeric values.
- **Suggestion:** Provide native JSON schema enforcement mode (similar to tool use schema validation) directly in the Converse API inference configuration.

#### Entry 5: Live Bedrock Model Invocations and TV Latency Budget
- **Task Attempted:** Measure cold-start and warm round-trip latency of `amazon.nova-lite-v1:0` under a 10-foot living room interaction budget.
- **Steps:** [TODO: Add steps once live AWS credentials are authenticated in testing environment]
- **Expected vs Actual:**
  - *Expected:* [TODO: Record expected response latency for TV interaction (e.g. < 1,500 ms)]
  - *Actual:* [TODO: Record actual cold-start handshake and warm round-trip latency measured via `npm run bedrock:check`]
- **Severity:** [TODO: Low / Medium / High]
- **Workaround:** Implemented a non-blocking `warmupBedrock()` routine, in-memory caching for repeated queries, and deterministic local fallbacks with configurable timeout (`BEDROCK_TIMEOUT_MS`).
- **Suggestion:** Provide pre-warmed connection guidance or edge streaming token utilities tailored for TV frontends.

---

### What's Next for OnePick
- Direct integration with Fire TV Live TV channels and Prime Video deep-linking (`amzn://run?...`).
- Voice integration via Alexa Voice Service (AVS) on Fire TV Remotes.
- Long-term household viewing memory to automatically balance fairness across consecutive movie nights.
