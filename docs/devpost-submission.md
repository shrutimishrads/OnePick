# Devpost Submission Text: OnePick

### Project Title
**OnePick**

### Tagline (Elevator Pitch)
*An AI household viewing concierge on Fire TV that resolves group couch debates in under 60 seconds using Rawlsian fairness and AWS Bedrock.*

### Tracks & Challenges
- **Primary Track:** Fire TV (Sub-category: *AI-enhanced viewing* / *Family entertainment*)
- **Mini-Challenge:** AWS Builder Mini Challenge

---

### Inspiration
Every evening in millions of households, friends and families sit on the couch and waste 30 to 45 minutes aimlessly scrolling streaming carousels because no single person can agree on what to watch. Traditional recommendation algorithms are fundamentally broken for living rooms: they personalize strictly for a single user profile, leading to compromises where someone is always unhappy. We built **OnePick** to turn decision fatigue into a shared household consensus in under a minute.

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
- **AWS Bedrock Integration (`api/bedrock.ts`):** Employs the Amazon Bedrock Converse API (`@aws-sdk/client-bedrock-runtime`) for natural language constraint parsing and natural explanation generation, bounded by configurable timeouts, response caching, strict JSON schema validation, and deterministic fallbacks.
- **Curated Living Room Library:** Exactly 20 curated titles with detailed metadata, genre weights, mood tags, and runtime constraints.

---

### Challenges We Ran Into
- **10-Foot Focus & WebView D-Pad Lifecycle:** Managing TV remote focus inside an embedded WebView without focus traps or invisible tab stops required strict spatial navigation and key listeners. Bridging Android's native Back button to dismiss modal overlays required a two-way JavaScript bridge so users don't accidentally exit the app while viewing candidate breakdowns.
- **Predictable Television Response Times:** Living room users expect immediate feedback. Relying on an LLM to generate candidate recommendations risks hallucinations and latency spikes. We solved this by using AWS Bedrock strictly for structured constraint extraction and explanation, keeping the candidate ranking completely deterministic in TypeScript.

---

### Accomplishments That We're Proud Of
- Designing a genuinely fair group aggregation formula that guarantees no viewer feels ignored.
- Building a full 10-foot TV interface with keyboard and on-screen remote simulation, alongside an Android WebView wrapper project configured for Fire OS.
- Automated unit test suite covering constraint filtering, watched history exclusions, Bedrock JSON sanitization, and fairness ranking.

---

### What We Learned
- Designing for a 10-foot television interface demands completely different UX paradigms than desktop or mobile apps: focus clarity, contrast, and remote navigation speed are paramount.
- How to effectively combine deterministic rule engines with generative AI: preventing generative hallucinations by keeping scoring strictly grounded in deterministic rules, using LLMs only for semantic parsing and natural explanations.

---

### What's Next for OnePick
- Direct integration with Fire TV Live TV channels and Prime Video deep-linking (`amzn://run?...`).
- Voice integration via Alexa Voice Service (AVS) on Fire TV Remotes.
- Long-term household viewing memory to automatically balance fairness across consecutive movie nights.
