# Domain 20: Student-Facing Learning Skills — Builder Brief
*For Claude Code. Read this entire document before writing a single skill.*
*Created: May 2026. Author: Gareth Manning.*

---

## What Domain 20 Is

Domain 20 extends the Education Agent Skills Library from educator-facing pedagogy into student-facing cognitive engagement. Every skill in Domains 1–19 helps a teacher or designer *create* something: a retrieval quiz, a hint sequence, an SRL scaffold, a rubric. Domain 20 skills *are* the interaction the student experiences. They run live, in conversation, as system-level instructions that shape how an AI responds to a learner.

The governing principle: **no substantive assistance without prior cognitive evidence from the learner.** The student must retrieve, attempt, explain, predict, diagnose, calibrate, or judge before the AI provides help. The AI's role is to inspect, probe, scaffold, and fade — not to replace the learner's reasoning.

These skills are designed for students who want to get better, not students who want to get done. The target learner is someone engaged in self-determined learning — motivated to build genuine capability, not just complete assignments. The tone must be collaborative ("I'll tell you which parts are on track") not punitive ("I won't tell you the answer").

**Licence:** CC BY-SA 4.0 (same as all other domains).

---

## How Domain 20 Differs from All Other Domains

| Dimension | Domains 1–19 | Domain 20 |
|-----------|-------------|-----------|
| User | Teacher, designer, school leader | Student / independent learner |
| Function | Generates a planning artefact | Runs a live learning interaction |
| Output | Document, plan, rubric, scaffold | Conversation with evidence captured |
| Invocation | Teacher pastes input, receives output | Student enters learning mode; skill governs AI behaviour throughout session |
| Time | Teacher spends 2–5 minutes | Student session lasts 10–60 minutes |
| Evidence | Produces teacher-usable materials | Produces structured learning evidence about the student's cognition |

The skills must still meet the library's three tensions — rigour, usability, specificity — but "usability" now means: **a student can activate a skill, understand what's expected of them, and experience productive cognitive engagement within 60 seconds.**

---

## Model Agnosticism Requirement

Domain 20 skills must work as system instructions in any LLM: Claude, ChatGPT, Codex, Gemini, any agent framework, any MCP server. Hard rules:

- No Claude-specific features (no tool_use blocks, no artifacts, no MCP tool calls in the prompt itself).
- No model-specific syntax. Use plain natural language instructions.
- Use `{{double_brackets}}` for all input placeholders (same as Domains 1–19).
- The prompt must be a single, self-contained system instruction that can be pasted into any LLM's system prompt field.
- Test: if you paste the prompt into ChatGPT as a custom instruction, does it work? If not, rewrite.

---

## The Evidence-Captured Schema Extension

Domain 20 introduces a new YAML schema section: `evidence_captured`. This specifies the structured learning evidence each skill produces during a session. This is the data that Kaku's Tutor Agent, Hippo, or any analytics system can consume.

```yaml
evidence_captured:
  cognitive_gate: "first_attempt | retrieval | self_explanation | prediction | diagnosis | calibration | verification"
  student_attempt_required: true  # student must produce text/audio/code/diagram before help
  confidence_before: true  # 0–100 rating captured before attempt
  confidence_after: true  # 0–100 rating captured after help
  hint_level_reached: "0–5"  # 0 = no hints needed; 5 = maximum support
  error_type: "conceptual | procedural | strategic | representational | none | not_applicable"
  ai_support_type: "question | hint | parallel_example | consolidation | warm_start | none"
  reflection_captured: true  # student produces post-help reflection
  transfer_check: "passed | failed | skipped | not_applicable"
  unassisted_followup: "scheduled | completed | not_scheduled"
  assistance_tag: "assisted | scaffolded | unassisted"  # assisted–unassisted comparison
```

Every Domain 20 skill must specify in its YAML header which of these fields it populates and which are `not_applicable`. This makes skills composable and their evidence aggregatable.

---

## The Warm-Start Protocol (Critical Edge Case)

Every skill in Domain 20 must handle the learner who says "I don't know anything about this" or "I have no idea where to start." This is the hardest design problem. A skill that blocks help entirely when the learner has zero footing produces abandonment, not productive failure.

The protocol, in order:

1. **Activate adjacent knowledge.** "What does this topic remind you of, even loosely?" / "Have you seen anything like this before in a different context?"
2. **Invite a wrong guess.** "What's your best guess, even if you know it's probably wrong?" / "If you had to explain this to a friend right now, what would you say?"
3. **Offer a framing question.** "Here's a question to get you started: [specific orienting question]. What's your first reaction?"
4. **Minimal orientation (last resort only).** Provide a single contrasting pair, a brief scenario, or a worked parallel example from a *different* domain. Never the target content. Log that warm-start was needed — this is evidence about readiness.

The warm-start must be logged as `ai_support_type: warm_start` in the evidence. If a learner consistently needs warm-starts, this signals a readiness gap that should surface to a teacher or to the learner's own SRL review.

Skills must not skip straight to warm-start. The first three probes cost almost nothing and often activate knowledge the learner didn't realise they had.

---

## The 13 Skills

### Skill 20-01: Retrieve-First Gate

**What it does:** Before any explanation, summary, or answer, requires the learner to produce a free-recall attempt on the topic plus a confidence rating. The AI then evaluates which parts of the recall are correct, which are missing, and which contain misconceptions — and works from there.

**Evidence:** Roediger & Karpicke (2006) testing effect; Dunlosky et al. (2013) practice testing as high-utility technique; Bjork & Bjork (2011) desirable difficulties. **Evidence strength: strong.**

**Edge cases:** Learner says "I know nothing" → warm-start protocol. Learner gives one-word answer → probe: "Can you say a bit more? Even partial ideas help." Learner pastes content from elsewhere → detect and redirect: "That looks like it might be from your notes. Try closing them and telling me what you remember."

**Chains well with:** 20-02, 20-04, 20-07, 20-11.

---

### Skill 20-02: Explain-First Interrogator

**What it does:** Requires the learner to articulate their reasoning, explain a concept, or walk through their thinking before the AI evaluates, corrects, or extends. The AI probes the weakest part of the explanation — never rewrites it.

**Evidence:** Chi et al. (1994) self-explanation effect; Bisra et al. (2018) meta-analysis (64 reports); arXiv 2604.00142 LLM-supported self-explanation improving transfer. **Evidence strength: strong.**

**Edge cases:** Learner gives a vague or circular explanation → probe the specific gap: "You said X leads to Y — can you explain the mechanism?" Learner says "I can't explain it, I just know it" → "Try explaining it as if to someone who's never seen this before. Start with the most basic piece." Learner's explanation is actually correct and complete → acknowledge and move to transfer: "That's solid. Can you think of a case where this wouldn't apply?"

**Chains well with:** 20-01, 20-05, 20-07, 20-08.

---

### Skill 20-03: Progressive Hint Ladder

**What it does:** Provides graduated assistance from abstract conceptual nudge to concrete procedural step, with reflection required at each level before escalation. Never gives the full answer. Teaches help-seeking as a skill — asks the learner what kind of help they think they need before providing it.

**Evidence:** VanLehn (2011) ITS effect sizes (d = 0.76); Koedinger & Aleven assistance dilemma; Aleven & Koedinger (2002) hint-seeking behaviour; help-seeking research (Karabenick & Berger, 2013). **Evidence strength: strong.**

**Hint levels:**
- Level 0: "What have you tried so far?" (diagnose before helping)
- Level 1: Conceptual question — points toward the relevant principle without naming it.
- Level 2: Analogy or parallel — "This is similar to [related concept]. What's the connection?"
- Level 3: Principle reminder — names the relevant rule, theorem, or concept.
- Level 4: Procedural nudge — "The next step involves [specific operation]. Try it."
- Level 5: Near-complete scaffold — "Here's how a similar problem works: [worked parallel example]. Now apply the same logic to yours."

**Never reaches:** Full solution. The learner must always assemble the final step themselves.

**Edge cases:** Learner clicks through hints rapidly without engaging → pause and require a sentence about what the last hint told them before proceeding. Learner is stuck at Level 5 → offer consolidation: "Let me walk through a parallel example, then you try yours again." Learner asks "just tell me the answer" → redirect: "I know this is frustrating. Tell me specifically what's confusing — is it the concept, the procedure, or how to start?"

**Chains well with:** 20-01, 20-05, 20-09, 20-11.

---

### Skill 20-04: Confidence Calibration Check

**What it does:** Captures a confidence rating (0–100) before an attempt and after receiving feedback. Compares the two. Flags overconfidence (high confidence + poor performance) and underconfidence (low confidence + good performance). Over time, tracks calibration accuracy as a metacognitive skill.

**Evidence:** Bjork & Bjork (2011) illusion of competence; Dunning-Kruger effect literature; Koriat & Bjork (2005) on illusions of confidence; metacognitive monitoring research (Thiede et al., 2003). **Evidence strength: moderate–strong.**

**Edge cases:** Learner always says 50% → probe: "Is that genuinely your uncertainty, or are you hedging? Try committing to a direction — you can always update." Learner is consistently well-calibrated → acknowledge: "Your confidence tracking is accurate — that's a real skill. Let's see if it holds on a harder question." Learner becomes anxious about ratings → reassure: "This isn't graded. The point is noticing the gap between how sure you feel and how much you actually know — that gap is where learning happens."

**Chains well with:** 20-01, 20-02, 20-06, 20-10, 20-11.

---

### Skill 20-05: Stuck & Error Diagnosis Coach

**What it does:** When a learner gets something wrong or feels stuck, requires them to diagnose the problem before receiving help. Asks: What have you tried? Where exactly does it break down? What kind of mistake do you think this is (conceptual, procedural, strategic, or something else)? Then helps based on the diagnosis rather than the surface error.

**Evidence:** Help-seeking research (Karabenick & Berger, 2013); VanLehn (2011) on step-level granularity; Hattie & Timperley (2007) feedback model (process and self-regulation levels). **Evidence strength: moderate–strong.**

**Edge cases:** Learner says "it's all wrong" → break it down: "Show me the first step. Is that part right?" Learner correctly diagnoses the error → affirm and let them self-correct: "You've identified the problem. What would you change?" Learner misdiagnoses the error → guide gently: "That's a reasonable thought, but look at [specific element] — what do you notice?"

**Chains well with:** 20-03, 20-04, 20-09, 20-11.

---

### Skill 20-06: AI Claim Checker

**What it does:** After any substantive AI-generated explanation or claim, requires the learner to identify one place it could be wrong, one thing they'd check to verify it, and one source they'd consult. Treats AI output as a claim to evaluate, not truth to absorb.

**Evidence:** Long & Magerko (2020) AI literacy framework; Efimova & Nygren (2026) epistemic vigilance; UNESCO AI Competency Framework (Miao & Cukurova, 2024); Roe et al. (2024) critical AI literacy. **Evidence strength: moderate–strong.**

**Edge cases:** Learner says "it all looks right to me" → provide a specific probe: "Look at [specific claim]. How would you verify that independently?" Learner identifies a genuine AI error → excellent: "Good catch. Fix it and explain why it was wrong." Learner fabricates a false criticism to satisfy the gate → push deeper: "You said X is wrong. What's the correct version, and how do you know?"

**Chains well with:** 20-02, 20-07, 20-10.

---

### Skill 20-07: Transfer Bridge

**What it does:** After the learner demonstrates understanding of a concept, presents a near-transfer and a far-transfer challenge. Asks: what's the same, what's different, and what principle travels? Tests whether learning is portable or task-specific.

**Evidence:** Bransford & Schwartz (1999) preparation for future learning; Biswas et al. (2010, 2016) Betty's Brain transfer findings; Kapur (2016) productive failure and transfer. **Evidence strength: moderate.**

**Edge cases:** Learner handles near-transfer easily → good: move to far-transfer. Learner fails far-transfer → this is expected and useful: "That's a hard jump. What made it different? Which part of the principle still applies?" Learner refuses to attempt transfer → warm-start: "Just try describing what's similar between the two situations."

**Chains well with:** 20-01, 20-02, 20-09, 20-11.

---

### Skill 20-08: Teach-Back Evaluator

**What it does:** The learner teaches the concept to the AI, which plays the role of a curious, slightly confused peer. The AI asks clarifying questions from the novice perspective, identifies gaps in the explanation, and scores the teach-back for coherence, completeness, and misconception risk. The learner must achieve a clear explanation before the session progresses.

**Evidence:** Biswas et al. (2008, 2016) Betty's Brain / learning by teaching; the protégé effect (Bargh & Schul, 1980); Roscoe & Chi (2007) on tutor learning. **Evidence strength: moderate.**

**Edge cases:** Learner gives a textbook-perfect but mechanical recitation → probe understanding: "I think I get the steps, but *why* does step 2 work? What would happen if you skipped it?" Learner gets frustrated teaching → acknowledge: "Teaching is hard — it forces you to organise what you know. Which part is hardest to explain?" Learner uses jargon without explaining it → ask as the novice: "Wait, what does [term] actually mean? Pretend I've never heard it."

**Chains well with:** 20-02, 20-07, 20-10.

---

### Skill 20-09: Productive Failure Protocol

**What it does:** For novel or complex problems, stages exploration before instruction. The learner must produce at least two attempted approaches and explain why each might or might not work. Only after genuine exploration does the AI offer consolidation — and the consolidation explicitly builds on the learner's own attempts and errors, not from scratch.

**Evidence:** Kapur (2008, 2014, 2016) productive failure; Sinha & Kapur (2021) meta-analytic review; Loibl & Rummel (2014) on the role of contrasting cases. **Evidence strength: strong (for well-designed implementations).**

**Edge cases:** Learner produces one attempt and says "I'm stuck" → "You've got one approach. Before I help, try a completely different angle — even if it feels wrong." Learner's first attempt is actually correct → great: "That works. Can you think of an approach that wouldn't work, and explain why?" Learner is frustrated by the requirement for two attempts → "I know this feels slow. The research shows that struggling with two approaches before getting help produces significantly better understanding than getting help after one. Let's try."

**Design note:** This skill has the highest risk of feeling punitive. The tone must be warm and the rationale transparent. Do not implement as a blunt "you must try twice" gate — frame it as collaborative exploration.

**Chains well with:** 20-03, 20-05, 20-07, 20-10.

---

### Skill 20-10: SRL Session Wrapper

**What it does:** Wraps a learning session in a plan → monitor → reflect cycle. At session start: "What are you trying to learn today? What's your plan? How confident are you?" Mid-session (after ~15 minutes or a natural breakpoint): "How's it going? Is your approach working? Do you need to adjust?" At session end: "What did you learn? What changed in your understanding? What will you do differently next time?"

**Evidence:** Zimmerman (2000) SRL cycles; Bannert (2007, 2009) metacognitive prompts during learning; Winne & Hadwin (1998) COPES framework; Frontiers in Education (2025) meta-analysis on AI and SRL. **Evidence strength: moderate.**

**Edge cases:** Learner skips the opening plan → gently insist: "Before we start, 30 seconds: what's your goal for this session? Even a rough one helps." Learner's plan is too vague ("learn about X") → sharpen: "Can you make that more specific? What would you be able to do at the end that you can't do now?" Learner skips closing reflection → prompt once, then log as skipped — forced reflection that feels coerced loses its value.

**Chains well with:** 20-04, 20-11, 20-12, 20-13.

---

### Skill 20-11: Unassisted Evidence Checkpoint

**What it does:** After scaffolded practice, schedules an unassisted check — a problem or question the learner must attempt with no AI help. The result is tagged as `assistance_tag: unassisted` in the evidence. This applies a broader implication of Bastani et al. (2025) by recording performance *with* AI separately from performance *without* it; the checkpoint itself was not tested in that study.

**Evidence:** Bastani et al. (2025) PNAS — unguarded GPT-4 improved assisted practice performance but reduced subsequent unassisted exam performance by 17% relative to the control group. The study supports recording assisted and unassisted performance separately, but it did not test this checkpoint protocol, long-term retention, or broad transfer. Related retrieval-practice and assistance-dilemma research supports the rationale for independent checks. **Evidence strength: moderate.**

**Edge cases:** Learner asks for help during unassisted check → firm redirect: "This one is just you — no hints. Give it your best attempt and we'll review together after." Learner does poorly on unassisted check after strong scaffolded performance → this is the skill's most valuable output: "Interesting — you did well with support but found this harder alone. That's important information. What felt different?" Learner does well → celebrate genuinely while keeping the inference bounded: "You got this problem right without help. That's strong evidence for this attempt. Let's see if it holds over time and on other problems."

**Chains well with:** 20-01, 20-04, 20-07, 20-10, 20-12.

---

### Skill 20-12: Weekly Agency Review

**What it does:** Reviews the learner's week (or multi-session period) using accumulated evidence: first-attempt rates, hint depths, confidence calibration accuracy, transfer results, unassisted check results. Asks the learner to identify patterns and set a strategy goal for the next period.

**Evidence:** Zimmerman (2000) SRL forethought-performance-reflection; Hattie (2009) on metacognitive strategies (d ≈ 0.69); learning analytics research on learner dashboards. **Evidence strength: moderate.**

**Requires:** Persistent data from prior sessions (Second Brain memories, Supabase table, or conversation history within a project).

**Edge cases:** Not enough data yet (first week) → use the session as a goal-setting exercise: "Since we're just starting, what do you want to focus on this week? How will you know if it's working?" Learner shows improving patterns → acknowledge and raise the bar. Learner shows plateaus → diagnose together: "Your retrieval scores are consistent but your transfer checks are harder. What do you think is going on?"

**Chains well with:** 20-04, 20-10, 20-11, 20-13.

---

### Skill 20-13: Fading Manager

**What it does:** Tracks the learner's performance across sessions and reduces scaffolding as competence is demonstrated. Makes the fading visible: "You've handled three sessions without hints — I'm going to start with less support this time. If you need more, just ask." Periodically removes scaffolds entirely to test independence.

**Evidence:** Collins, Brown & Newman (1989) cognitive apprenticeship — fading is one of the six methods; Pea (2004) on fading in scaffolding; SRL research on graduated autonomy. **Evidence strength: moderate.**

**Requires:** Persistent data from prior sessions.

**Edge cases:** Learner struggles after scaffold reduction → restore one level and explain: "Looks like that jump was too big. Let me bring back a bit of support." Learner games the system (performs well with scaffolds to avoid their removal) → unlikely with self-determined learners, but if detected: "Your scaffolded performance is strong. Let's see what happens without the net — that's where the real learning is."

**Chains well with:** 20-03, 20-10, 20-11, 20-12.

---

## Build Order

**Phase 1: Core gates (build first, test immediately)**
1. 20-01 Retrieve-First Gate
2. 20-02 Explain-First Interrogator
3. 20-04 Confidence Calibration Check
4. 20-05 Stuck & Error Diagnosis Coach
5. 20-11 Unassisted Evidence Checkpoint

These five are small (S), composable, and test the fundamental pattern: cognitive evidence before help, unassisted evidence after.

**Phase 2: Help and challenge (build next)**
6. 20-03 Progressive Hint Ladder
7. 20-06 AI Claim Checker
8. 20-07 Transfer Bridge
9. 20-08 Teach-Back Evaluator

These are medium (M) and add the richer interaction patterns.

**Phase 3: Struggle, reflection, and longitudinal tracking (build last)**
10. 20-09 Productive Failure Protocol
11. 20-10 SRL Session Wrapper
12. 20-12 Weekly Agency Review
13. 20-13 Fading Manager

These require more careful design (productive failure) or persistent data (weekly review, fading).

---

## Quality Checklist (per skill)

- [ ] YAML schema header complete and machine-parseable?
- [ ] `evidence_captured` section specifies all applicable fields?
- [ ] Evidence claims name specific authors and studies?
- [ ] Prompt works as a plain system instruction in Claude, ChatGPT, and Codex?
- [ ] No model-specific features or tool_use blocks?
- [ ] Warm-start protocol included for the "I don't know" edge case?
- [ ] Edge cases documented: minimal-effort attempts, gaming, anxiety, genuine confusion?
- [ ] Tone is collaborative, not punitive?
- [ ] Example transcript shows a realistic student interaction?
- [ ] Known Limitations honest and specific?
- [ ] `chains_well_with` populated with relevant Domain 20 skill IDs?
- [ ] The skill would survive contact with an impatient-but-motivated learner?

---

## Adapted Skill Template for Domain 20

```markdown
---
skill_id: "student-learning/retrieve-first-gate"
skill_name: "Retrieve-First Gate"
domain: "student-learning"
domain_number: 20
version: "1.0"
audience: "student"
evidence_strength: "strong"
evidence_sources:
  - "Roediger & Karpicke (2006) — Test-enhanced learning"
  - "Dunlosky et al. (2013) — Improving students' learning with effective learning techniques"
  - "Bjork & Bjork (2011) — Making things hard on yourself, but in a good way"
input_schema:
  required:
    - field: "topic"
      type: "string"
      description: "What the student is trying to learn or review"
    - field: "context"
      type: "string"
      description: "Brief context: course, assignment, or self-directed goal"
  optional:
    - field: "prior_sessions"
      type: "array"
      description: "Evidence from previous sessions (from context engine or Second Brain)"
    - field: "developmental_band"
      type: "string"
      description: "Learner age/stage for calibrating language and complexity"
evidence_captured:
  cognitive_gate: "retrieval"
  student_attempt_required: true
  confidence_before: true
  confidence_after: true
  hint_level_reached: "not_applicable"
  error_type: "not_applicable"
  ai_support_type: "question | warm_start"
  reflection_captured: true
  transfer_check: "not_applicable"
  unassisted_followup: "not_applicable"
  assistance_tag: "scaffolded"
chains_well_with:
  - "student-learning/explain-first-interrogator"
  - "student-learning/confidence-calibration-check"
  - "student-learning/transfer-bridge"
  - "student-learning/unassisted-evidence-checkpoint"
tags: ["retrieval", "memory", "metacognition", "gate"]
---

# Retrieve-First Gate

## What This Skill Does

[Description — same format as Domains 1–19 but oriented to the student interaction]

## Evidence Foundation

[Same format — specific citations with dates]

## System Prompt

[The actual prompt that governs AI behaviour during the student interaction.
Must work in Claude, ChatGPT, Codex, or any LLM as a system instruction.
Must include:
- Role framing as a learning coach (not a teacher, not an oracle)
- The cognitive gate logic
- The warm-start protocol
- Tone instructions (collaborative, curious, never punitive)
- Evidence capture instructions
- Self-check: "Before giving any explanation, verify the student has produced a genuine recall attempt"]

## Example Transcript

[A realistic multi-turn conversation showing the skill in action, including at least one edge case handled well]

## Known Limitations

[Honest and specific]
```

---

## Build Instructions for Claude Code

For each skill, in this order:

1. Read this brief completely. Read the existing library brief (v3) for format reference.
2. Research the evidence base for the specific skill. Write 3–5 specific citations.
3. Write the YAML schema header including the `evidence_captured` section.
4. Write the system prompt. The evidence-based criteria must be inside the prompt. Include the warm-start protocol. Include edge-case handling. Include tone instructions.
5. Write a realistic example transcript — a multi-turn student conversation showing the skill working, including at least one edge case.
6. Write Known Limitations.
7. Test: paste the system prompt into ChatGPT (or another non-Claude LLM) and run through the example scenario. Does it work? If not, rewrite until it does.

**Hard rules:**
- Never use "research shows" without naming who and what.
- Every skill must handle the "I don't know" case via warm-start protocol.
- Every skill must handle the "minimal effort" case (one-word answers, gaming).
- Tone must be collaborative. Read every instruction aloud and ask: does this sound like a coach or a gatekeeper?
- Build Phase 1 completely (skills 20-01 through 20-05 plus 20-11), then test as a learner before continuing.
- Each skill is a single .md file. Never split a skill across files.
- Commit and push when done.

---

## What Domain 20 Is Not

- Not a general AI tutor. It does not teach subjects. It shapes how AI responds to learners who are studying subjects.
- Not a chatbot personality. It is a set of interaction constraints grounded in learning science.
- Not a replacement for human teaching. It is a layer that makes AI-assisted study more cognitively productive.
- Not a surveillance tool. Evidence is for the learner's benefit first. Teacher visibility is optional and should be transparent.

---

## Strategic Context

Domain 20 skills are the intelligence that Kaku's Tutor Agent will call. They are the interaction patterns that Hippo can embed. They are the open-source credibility layer for a commercial orchestration product. Build them well and they become the standard for what student-facing AI should do. Build them badly and they're just another prompt library.

The bar: if a learning scientist read the system prompt and the example transcript, they should nod. If a motivated 16-year-old used the skill for 20 minutes, they should feel like they learned more than they would have from raw ChatGPT. If neither is true, the skill isn't done.
