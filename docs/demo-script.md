# OnePick Demo Script (3-Minute Presentation)

**Track:** Fire TV Developer Hackathon & AWS Builder Mini Challenge  
**Target Time:** 2 minutes 45 seconds

---

## 0:00 - 0:30 | The Household Dilemma (Problem)
- **Visual:** Fire TV home screen with OnePick launched.
- **Narrator:** 
  > *"Every evening, millions of households sit down on the couch and waste 30 to 45 minutes scrolling endless streaming carousels because no single person can agree on what to watch. Areeba wants action, adventure, and sci-fi. Harshit wants sci-fi, action, and clever mystery, while strictly excluding romance. Shruti wants charming animation and fantasy, while strictly excluding mystery. Traditional algorithms optimize for a single profile. OnePick solves the group consensus dilemma directly on your TV."*

---

## 0:30 - 1:15 | Meet the Viewers & The Fairness Engine (Slices 1-3)
- **Visual:** D-pad navigation highlights Areeba (👩‍🔬), Harshit (🎨), and Shruti's (⚡) profile cards.
- **Narrator:**
  > *"OnePick activates the present household members using simple remote navigation. Notice how each viewer has explicit preferences and dealbreakers—including genuine conflicting tastes where Harshit loves mystery while Shruti strictly excludes it.*
  > *Instead of an unpredictable black box or simple majority vote, OnePick uses a deterministic **Rawlsian max-min fairness engine** running in the local Node server. It optimizes for the minimum satisfaction across the couch so nobody gets steamrolled."*
- **Action:** Initial calculation renders on the TV display.
- **Result:**
  - **Pick #1:** *Cosmic Drift: Web of Worlds* (117 min)
  - **Group Fairness Score:** 75% (Areeba: 90%, Harshit: 85%, Shruti: 70% — Shruti is visibly the fairness bottleneck)

---

## 1:15 - 2:00 | Conversational Constraint Patching (Bedrock Parse)
- **Visual:** Voice-style refine (text input) prompt appears.
- **Input 1 (Voice-style refine):**
  > *"Refinement 1: 'We already watched Cosmic Drift together last week!'"*
- **Action:** Amazon Bedrock Converse API parses the utterance into a deterministic constraint patch: `{"watched": ["t-spider-verse"]}`.
- **Result:**
  - **Pick #2:** *Spirit Realm Crossing* (125 min)
  - **Group Fairness Score:** 61% (Areeba: 70%, Harshit: 55%, Shruti: 85% — Shruti's score jumps +15%!)
- **Input 2 (Voice-style refine):**
  > *"Refinement 2: 'Shruti has to wake up early tomorrow, keep it under 100 minutes.'"*
- **Action:** Bedrock applies `{"maxMinutes": 100}`.
- **Result:**
  - **Final Consensus Pick:** *The Clever Burrower* (87 min)
  - **Group Fairness Score:** 58% (Areeba: 65%, Harshit: 50%, Shruti: 95% — Shruti peaks at 95% satisfaction safely under the runtime cap!)

---

## 2:00 - 2:30 | Transparent Consensus AI (Bedrock Explain)
- **Visual:** Remote presses `Select` on "Why this pick?".
- **Narrator:**
  > *"No more arguments over compromises. Bedrock synthesizes the score breakdown into two plain-English sentences: explaining how the pick satisfies Shruti's animation and comedy preference with an exact charming mood match, while keeping Areeba and Harshit satisfied, all safely under the 100-minute cutoff."*

---

## 2:30 - 2:45 | Conclusion & Call to Action
- **Narrator:**
  > *"OnePick turns decision fatigue into one fair pick in under 60 seconds, combining deterministic local math with AWS Bedrock intelligence on Fire TV. Thank you!"*
