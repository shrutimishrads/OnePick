# Product Feedback for Amazon Developer & AWS Teams
> **Hackathon Submission Component:** *Build, Ship, Shape: Amazon Developer Hackathon 2026*  
> **Team:** OnePick

---

## 1. Fire TV & TV Runtime Feedback

### Strengths:
- **Web App First-Class Support:** Fire TV's compatibility with standard HTML5/CSS and React Native for TV makes porting 10-foot interfaces straightforward.
- **D-Pad Focus Engine:** Standard spatial navigation keyboard events (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`) integrate cleanly with standard web focus managers.

### Constructive Areas for Improvement:
1. **Vega SDK Cross-Platform Tooling:**
   - *Observation:* Setting up the Vega Virtual Device (VVD) on Windows host machines requires nested virtualization within WSL2, which frequently encounters hypervisor conflicts compared to native macOS or Ubuntu setups.
   - *Recommendation:* Provide a lightweight browser-based TV simulator or pre-configured Docker/DevContainer image for Windows developers to test 10-foot layouts without heavy hypervisor configuration.
2. **TV Focus Debugging:**
   - *Recommendation:* Introduce an automated D-pad focus inspector in Amazon Devices Builder Tools to detect unreachable focus traps in 10-foot UI layouts.

---

## 2. AWS Bedrock & Converse API Feedback

### Strengths:
- **Converse API Consistency:** The unified `Converse` endpoint across model providers (Amazon Nova, Anthropic Claude) dramatically reduced boilerplate code when parsing multi-turn natural language inputs.
- **Low Latency on Light Models:** Amazon Nova Lite provides the rapid response times needed for 10-foot TV experiences where user patience is measured in milliseconds.

### Constructive Areas for Improvement:
1. **Latency Budgets for Living Room Experiences:**
   - *Observation:* In a 10-foot TV environment, any remote action exceeding 1,200 ms feels unresponsive on screen.
   - *Recommendation:* Provide built-in streaming token utilities tailored for TV frontends, or specialized fast-path JSON constraint extractors optimized for TV voice remotes.
2. **Free Tier Onboarding Clarity:**
   - *Recommendation:* Clearly document model quotas and regional availability for hackathon participants utilizing the standard AWS Free Tier after promotional credits are exhausted.
