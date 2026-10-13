# Product Feedback for Amazon Developer & AWS Teams
> **Hackathon Submission Component:** *Build, Ship, Shape: Amazon Developer Hackathon 2026*  
> **Team:** OnePick

---

## 1. Fire TV & Fire OS Developer Tooling

### Architecture Used:
- HTML5/TypeScript 10-foot TV UI served by Node.js.
- Native Android Leanback wrapper (`fireos/`) mapping Fire TV hardware remote keycodes (`KEYCODE_DPAD_*`, `KEYCODE_ENTER`, `KEYCODE_BACK`) to web key events.

### Developer Tooling Feedback & Observations:
1. **Fire OS Tooling & Emulator Setup:**
   - *[TODO: Add real first-hand observations here once the team completes building and running the fireos/ app inside Android Studio's TV emulator, including any Gradle sync or SDK version quirks encountered.]*
2. **Physical Hardware & ADB Sideloading:**
   - *[TODO: Team member with physical Fire TV hardware should add real observations regarding wireless ADB pairing, certificate prompt usability, and remote latency when sideloading on living room devices.]*
3. **10-Foot Focus & D-Pad Navigation in WebView:**
   - *[TODO: Add real observations on WebView focus handling on Fire OS, specifically whether hardware D-pad repeat rates require debouncing in the web layer.]*
4. **Tooling Recommendation:**
   - *Recommendation:* An automated 10-foot spatial focus linter in the Amazon Devices Builder Tools would help developers identify unreachable focus traps and verify overscan margins before submitting to the Amazon Appstore.

---

## 2. AWS Bedrock & Converse API Feedback

### Architecture Used:
- `@aws-sdk/client-bedrock-runtime` using `ConverseCommand`.
- Model: `amazon.nova-lite-v1:0` (configured via `BEDROCK_MODEL_ID`).
- Regional endpoint via `AWS_REGION` using standard AWS credential provider chain.
- Strict client-side JSON sanitization, configurable timeout budget (`BEDROCK_TIMEOUT_MS`, default 3000ms), and local deterministic fallback.

### API & Service Feedback:
1. **Converse API Structured Output:**
   - *Observation:* The unified Converse API (`client.send(new ConverseCommand(...))`) provides a clean interface across model families. However, forcing strict JSON output currently relies on prompt-level instructions and post-parse sanitization.
   - *Recommendation:* Provide built-in JSON schema enforcement (similar to tool use schema validation) directly in the Converse API inference configuration.
2. **Cold-Start & Connection Latency:**
   - *Observation:* The initial call to a cloud model includes TLS handshake and credential resolution, easily taking 1,500–2,500 ms on cold start. For living room TV apps, this requires deliberate warm-up calls or higher timeouts to avoid premature fallback.
   - *[TODO: If running live Bedrock with provisioned AWS credentials, insert real measured latency numbers (warm vs cold) here.]*
3. **Hackathon Free Tier Guidance:**
   - *Recommendation:* Provide clearer documentation on exact default concurrency quotas for Amazon Nova Lite in newly created AWS accounts when promotional credit codes are exhausted.
