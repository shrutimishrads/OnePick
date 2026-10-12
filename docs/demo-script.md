# OnePick Demo Script (3-Minute Presentation)

**Track:** Fire TV / Amazon Vega Developer Hackathon  
**Target Time:** 2 minutes 45 seconds

---

## 0:00 - 0:30 | The Household Dilemma (Problem)
- **Visual:** Fire TV home screen with OnePick launched.
- **Narrator:** 
  > *"Every evening, millions of households sit down on the couch and waste 30 to 45 minutes scrolling endless streaming carousels because no single person can agree on what to watch. Maya wants a thoughtful sci-fi mystery, Alex wants something light and funny under 100 minutes, and Sam wants action. Traditional algorithms optimize for a single profile. OnePick solves the group consensus problem directly on your TV."*

---

## 0:30 - 1:15 | Meet the Viewers & The Fairness Engine (Slice 1-3)
- **Visual:** D-pad navigation highlights Maya, Alex, and Sam's profile chips.
- **Narrator:**
  > *"OnePick activates the present household members using simple remote navigation. Notice how each viewer has explicit preferences and dealbreakers—like a strict exclusion on horror and differing runtime limits.*
  > *Instead of an unpredictable black box, OnePick uses a deterministic **Rawlsian max-min fairness engine** running directly on the device. It maximizes the happiness of the least-satisfied viewer so nobody gets steamrolled by a majority vote."*
- **Action:** D-pad selects "Find Consensus". The initial consensus pick appears with per-viewer satisfaction percentages.

---

## 1:15 - 2:00 | Conversational Constraint Patching (Bedrock Parse - Slice 6)
- **Visual:** Voice or quick text refinement prompt appears.
- **Narrator / Voice input:**
  > *"Refinement 1: 'We actually saw Spider-Verse together last week!'"*
- **Action:** AWS Bedrock Converse API parses the utterance into a deterministic constraint patch: `{"watched": ["t-spider-verse"]}`. The ranking shifts instantaneously without losing context.
- **Voice input:**
  > *"Refinement 2: 'Alex has to wake up early tomorrow, keep it under 100 minutes.'"*
- **Action:** Bedrock applies `{"maxMinutes": 100}`. Candidates re-rank instantly to spotlight *The Grand Budapest Hotel* or *Fantastic Mr. Fox*.

---

## 2:00 - 2:30 | Transparent Consensus AI (Bedrock Explain - Slice 5)
- **Visual:** Remote presses the `Select` button on "Why this pick?".
- **Narrator:**
  > *"No more arguments over compromises. Bedrock synthesizes the score breakdown into two plain-English sentences: explaining how the pick satisfies Alex's 100-minute time constraint while giving Maya the witty, quirky writing she loves, keeping everyone's satisfaction above 80%."*

---

## 2:30 - 2:45 | Conclusion & Call to Action
- **Narrator:**
  > *"OnePick turns decision fatigue into one fair pick in under 60 seconds, combining deterministic local math with AWS Bedrock intelligence on Fire TV. Thank you!"*
