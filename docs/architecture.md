# OnePick Architecture

```mermaid
flowchart TD
    subgraph FireTVApp ["Fire TV Client (app/ served by Node server, wrapped in fireos/ WebView)"]
        UI["TV UI & D-pad Remote Navigation"]
        State["Session State (Active Viewers & Constraints)"]
    end

    subgraph DeterministicCore ["Deterministic TypeScript Core (Runs in Node Server / On-Device)"]
        Filter["Hard Filters (Dealbreakers, Watched, Runtime)"]
        Scorer["Viewer Soft Scoring (Likes, Moods, Comfort)"]
        Fairness["Max-Min Rawlsian Fairness Aggregator"]
        Ranker["Ranked Candidates + Score Breakdown"]
    end

    subgraph CloudLayer ["AWS Bedrock Cloud Concierge"]
        BedrockParse["Bedrock Converse: Natural Language Intent -> ConstraintPatch JSON"]
        BedrockExplain["Bedrock Converse: Score Breakdown -> Consensus Explanation"]
    end

    UI --> State
    State --> Filter
    Filter --> Scorer
    Scorer --> Fairness
    Fairness --> Ranker
    Ranker --> UI

    UI -- "Voice-Style Refine (Text Input)" --> BedrockParse
    BedrockParse -- "JSON Patch" --> State

    Ranker -- "Candidate & Viewer Scores" --> BedrockExplain
    BedrockExplain -- "Transparent 2-sentence rationale" --> UI
```

## Architectural Highlights
1. **Client / Server Model:** `app/` is a 10-foot web interface served by a local Node server (`app/server.ts`) and packaged inside a native Fire OS Android Leanback WebView (`fireos/`).
2. **Separation of Concerns:** Bedrock never invents movie titles or hallucinates rankings. All ranking is strictly deterministic, fast, and repeatable via pure TypeScript algorithms in `core/`.
3. **Offline Fallback:** If internet connectivity drops or Bedrock is unreachable, the core scoring engine and rule-based explanations run entirely locally in the Node server / on-device.
4. **Max-Min Group Fairness:** Rather than simple averaging (which favors the majority and leaves one person miserable), OnePick maximizes the lowest satisfaction score across all present viewers.
