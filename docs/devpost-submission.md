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
3. **Conversational Constraint Patching:** Uses the **Amazon Bedrock Converse API** to interpret voice or quick-text refinements (*"We saw that last week"*, *"Alex has an early meeting, keep it under 100 minutes"*) into structured JSON patches without losing state.
4. **Transparent Consensus AI:** Explains *why* the title was picked in plain English, explaining compromises and keeping everyone happy before hitting play.

---

### How We Built It
- **10-Foot TV UI:** Built using high-contrast 16:9 widescreen layouts, with native D-pad spatial focus management (`Arrow` keys, `Enter`, `Back`) and on-screen remote simulation.
- **Deterministic Core (`core/`):** Written in pure TypeScript with zero external dependencies. Executes locally on-device with sub-5ms latency and targeted unit tests for ranking and constraints.
- **AWS Bedrock Integration (`api/bedrock.ts`):** Employs the Bedrock Converse API with compact prompt templates and low token limits to parse intent and synthesize trade-off summaries.
- **Curated Living Room Library:** 20+ diverse titles with detailed metadata, genre weights, mood tags, and runtime constraints.

---

### Challenges We Ran Into
- **Windows Host Virtualization for Vega:** Setting up the Vega Virtual Device inside WSL2 on Windows machines presented virtualization bottlenecks. We resolved this by adopting a modular architecture that cleanly separates the deterministic core from the presentation layer, allowing Fire OS and web runtime execution.
- **Living Room Latency Budgets:** Television users expect instantaneous feedback. Relying purely on an LLM to generate titles produces hallucinations and 3-second delays. We solved this by using AWS Bedrock solely for semantic extraction and explanation, keeping the ranking engine 100% deterministic and local.

---

### Accomplishments That We're Proud Of
- Designing a genuinely fair group aggregation formula that guarantees no viewer feels ignored.
- Building a full 10-foot TV experience with remote control simulation that runs seamlessly in modern browsers and Fire TV runtimes.
- Automated unit test suite covering constraint filtering, watched history exclusions, Bedrock JSON sanitization, and fairness ranking.

---

### What We Learned
- Designing for a 10-foot television interface demands completely different UX paradigms than desktop or mobile apps: focus clarity, contrast, and remote navigation speed are paramount.
- How to effectively combine deterministic rule engines with generative AI to get the best of both worlds: zero hallucinations with conversational flexibility.

---

### What's Next for OnePick
- Direct integration with Fire TV Live TV channels and Prime Video deep-linking (`amzn://run?...`).
- Voice integration via Alexa Voice Service (AVS) on Fire TV Remotes.
- Long-term household viewing memory to automatically balance fairness across consecutive movie nights.
