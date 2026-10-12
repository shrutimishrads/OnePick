# OnePick Architecture

```mermaid
flowchart TD
    subgraph FireTVApp ["Fire TV / Vega Application"]
        UI["TV UI & D-pad Remote Navigation"]
        State["Session State (Active Viewers & Constraints)"]
    end

    subgraph DeterministicCore ["Deterministic TypeScript Core (Runs on-device or Cloud)"]
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

    UI -- "Voice / Quick Refinement" --> BedrockParse
    BedrockParse -- "JSON Patch" --> State

    Ranker -- "Candidate & Viewer Scores" --> BedrockExplain
    BedrockExplain -- "Transparent 2-sentence rationale" --> UI
```

## Architectural Highlights
1. **Separation of Concerns:** Bedrock never invents movie titles or hallucinates rankings. All ranking is strictly deterministic, fast, and repeatable.
2. **Offline Fallback:** If internet connectivity drops or Bedrock is unreachable, the core scoring engine and rule-based explanations run entirely locally on the Fire TV device.
3. **Max-Min Group Fairness:** Rather than simple averaging (which favors the majority and leaves one person miserable), OnePick maximizes the lowest satisfaction score across all present viewers.
