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
- **Task attempted:** Build and launch the Fire OS Leanback wrapper (`fireos/`) inside Android Studio's Fire TV emulator on a development workstation.
- **Steps:**
  1. [TODO: Add exact steps taken once executed on a machine with JDK 17 and Android SDK installed]
  2. [TODO: Record `./gradlew assembleDebug` or Android Studio build steps]
- **Expected vs actual:**
  - *Expected:* [TODO: Record expected emulator launch and build experience]
  - *Actual:* [TODO: Record exact build output, SDK licensing prompts, or Gradle sync quirks encountered]
- **Severity:** [TODO: Low / Medium / High]
- **Workaround:** [TODO: Describe workaround used during testing, e.g. using browser-based TV remote simulator with full D-pad keyboard mapping]
- **Suggestion:** [TODO: Suggestions for the Amazon Developer Tooling team regarding Fire TV emulator setup on Windows]

#### Entry 2: Physical Fire TV Sideloading & Hardware Remote Testing
- **Task attempted:** Sideload the debug APK onto a physical Fire TV device via wireless ADB and verify live remote response.
- **Steps:**
  1. [TODO: Add steps for enabling Developer Options and ADB Debugging on Fire TV]
  2. [TODO: Add wireless ADB pairing and `adb install` steps]
- **Expected vs actual:**
  - *Expected:* [TODO: Record expected installation and remote responsiveness]
  - *Actual:* [TODO: Record actual pairing UX, network security behaviors, or remote key latency observed]
- **Severity:** [TODO: Low / Medium / High]
- **Workaround:** [TODO: Detail any workarounds used for network discovery or cleartext HTTP on local LAN]
- **Suggestion:** [TODO: Suggestion for Amazon Fire TV device team regarding sideload developer experience]

#### Entry 3: 10-Foot Spatial Focus & WebView Key Repeat on Fire OS
- **Task attempted:** Verify WebView focus handling, remote key repeats, and back-button lifecycle in the Fire OS Leanback container.
- **Steps:**
  1. [TODO: Add steps taken navigating the 10-foot UI using the physical hardware remote D-pad]
  2. [TODO: Test rapid D-pad holding and modal dismiss key events]
- **Expected vs actual:**
  - *Expected:* [TODO: Record expected spatial navigation and modal dismissal behavior]
  - *Actual:* [TODO: Record actual key repeat rate, focus trap behavior, or WebView event handling]
- **Severity:** [TODO: Low / Medium / High]
- **Workaround:** [TODO: Detail any web-layer key debouncing or focus traps resolved]
- **Suggestion:** Introduce an automated 10-foot spatial focus linter in the Amazon Devices Builder Tools to detect unreachable focus traps and verify overscan margins before submission.

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
