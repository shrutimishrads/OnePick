# OnePick Demo Script (3-Minute Presentation)

**Track:** Fire TV Developer Hackathon  
**Target Time:** 2 minutes 45 seconds

---

## 0:00 - 0:30 | The Household Dilemma (Problem)
- **Visual:** Fire TV home screen with OnePick launched.
- **Narrator:** 
  > *"Every evening, millions of households sit down on the couch and waste 30 to 45 minutes scrolling endless streaming carousels because no single person can agree on what to watch. Maya wants sci-fi and action, Alex loves animation and comedy, and Sam wants action and adventure. Traditional algorithms optimize for a single profile. OnePick solves the group consensus problem directly on your TV."*

---

## 0:30 - 1:15 | Meet the Viewers & The Fairness Engine (Slices 1-3)
- **Visual:** D-pad navigation highlights Maya, Alex, and Sam's profile chips.
- **Narrator:**
  > *"OnePick activates the present household members using simple remote navigation. Notice how each viewer has explicit preferences and dealbreakers—like a strict exclusion on horror.*
  > *Instead of an unpredictable black box or simple majority vote, OnePick uses a deterministic **Rawlsian max-min fairness engine** running directly on the device. It maximizes the satisfaction of the least-satisfied viewer so nobody gets steamrolled."*
- **Action:** Initial calculation renders on the TV display.
- **Result:**
  - **Pick #1:** *Spider-Man: Into the Spider-Verse* (117 min)
  - **Group Fairness Score:** 86% (Maya: 85%, Alex: 85%, Sam: 90%)

---

## 1:15 - 2:00 | Conversational Constraint Patching (Bedrock Parse)
- **Visual:** Voice refinement prompt appears.
- **Voice input 1:**
  > *"Refinement 1: 'We already watched Spider-Verse together last week!'"*
- **Action:** AWS Bedrock Converse API parses the utterance into a deterministic constraint patch: `{"watched": ["t-spider-verse"]}`.
- **Result:**
  - **Pick #2:** *Top Gun: Maverick* (130 min)
  - **Group Fairness Score:** 70% (Maya: 70%, Alex: 70%, Sam: 70%)
- **Voice input 2:**
  > *"Refinement 2: 'Alex has to wake up early tomorrow, keep it under 100 minutes.'"*
- **Action:** Bedrock applies `{"maxMinutes": 100}`.
- **Result:**
  - **Final Consensus Pick:** *Fantastic Mr. Fox* (87 min)
  - **Group Fairness Score:** 69% (Maya: 65%, Alex: 80%, Sam: 65%)

---

## 2:00 - 2:30 | Transparent Consensus AI (Bedrock Explain)
- **Visual:** Remote presses `Select` on "Why this pick?".
- **Narrator:**
  > *"No more arguments over compromises. Bedrock synthesizes the score breakdown into two plain-English sentences: explaining how the pick satisfies Alex's animation and comedy preference while fitting Maya and Sam's taste in witty adventure, all safely under the 100-minute cutoff."*

---

## 2:30 - 2:45 | Conclusion & Call to Action
- **Narrator:**
  > *"OnePick turns decision fatigue into one fair pick in under 60 seconds, combining deterministic local math with AWS Bedrock intelligence on Fire TV. Thank you!"*
