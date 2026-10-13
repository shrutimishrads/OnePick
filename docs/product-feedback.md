# Product Feedback for Amazon Developer & AWS Teams
> **Hackathon Submission Component:** *Build, Ship, Shape: Amazon Developer Hackathon 2026*  
> **Team:** OnePick

---

## 1. Fire TV & Fire OS Developer Tooling

### Architecture Used:
- HTML5/TypeScript 10-foot TV UI hosted on Node.js.
- Native Android Leanback wrapper (`fireos/`) mapping Fire TV hardware remote keycodes (`KEYCODE_DPAD_*`, `KEYCODE_ENTER`, `KEYCODE_BACK`) to web key events.

### Developer Tooling Feedback:
1. **Windows Host Virtualization for Vega SDK:**
   - *Issue Encountered:* Developing on Windows 11 host machines, running the Vega Virtual Device (VVD) requires WSL2 with nested hardware virtualization enabled. In practice, this frequently causes hypervisor conflicts and crashes compared to native Linux/macOS environments.
   - *Recommendation:* Provide official pre-configured Docker/DevContainer recipes or lightweight browser-based simulation tools for developers building TV layouts on Windows.
2. **TV Focus & Overscan Debugging:**
   - *Recommendation:* Introduce an automated D-pad focus linter in Amazon Devices Builder Tools to detect unreachable focus traps in 10-foot UI layouts and verify 5% overscan margins automatically.
3. **Physical Hardware Deployment Experience:**
   - *[TODO: Team member with physical Fire TV Stick should add specific ADB sideloading and Wi-Fi debugging observations here before final submission]*

---

## 2. AWS Bedrock & Converse API Feedback

### Architecture Used:
- `@aws-sdk/client-bedrock-runtime` using `ConverseCommand`.
- Model: `amazon.nova-lite-v1:0` (configured via `BEDROCK_MODEL_ID`).
- Regional endpoint via `AWS_REGION` with standard AWS credential provider chain.
- Strict client-side JSON sanitization, 1,200ms timeout budget, and local deterministic fallback.

### API & Service Feedback:
1. **Converse API Structured Output:**
   - *Observation:* The unified Converse API (`client.send(new ConverseCommand(...))`) provides a clean interface across model families. However, forcing strict JSON extraction without markdown wrappers currently requires prompt-level enforcement.
   - *Recommendation:* Add native JSON schema enforcement mode (similar to tool use / structured outputs) directly into the Converse API inference config.
2. **Living Room Latency Budgets:**
   - *Observation:* Television 10-foot UX requires remote responses in under 1,200 ms to avoid perceived freeze.
   - *[TODO: If running live Bedrock with provisioned AWS credentials, insert actual observed time-to-first-token and round-trip milliseconds here]*
3. **Hackathon Free Tier Guidance:**
   - *Observation:* With promotional credit codes exhausted, teams rely on the AWS Free Tier.
   - *Recommendation:* Provide clearer documentation on exact default concurrency quotas for Amazon Nova Lite in newly created AWS accounts.
