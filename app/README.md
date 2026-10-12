# OnePick Fire TV / Vega Application

## Architecture
- **Framework:** React Native for TV / Vega OS SDK
- **Navigation:** 10-foot UI optimized for Fire TV D-pad navigation (`UP`, `DOWN`, `LEFT`, `RIGHT`, `SELECT`, `BACK`).
- **Focus Management:** Uses native TV focus engine (`hasTVPreferredFocus`, `focusable={true}`).
- **Scoring Integration:** Directly imports `@onepick/core` for zero-latency local consensus calculation, calling Bedrock only for conversational constraint parsing and natural language consensus explanations.
