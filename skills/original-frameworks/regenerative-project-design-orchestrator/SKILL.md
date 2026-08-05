---
# AGENT SKILLS STANDARD FIELDS (v2)
name: regenerative-project-design-orchestrator
description: "Use when designing education for regeneration, regenerative action, or competency-based regenerative curriculum. Separate ambition from pedagogy; orchestrate ethical learning, assessment, systems action, evidence, and stewardship."
disable-model-invocation: false
user-invocable: true
effort: high

# EXISTING FIELDS
skill_id: "original-frameworks/regenerative-project-design-orchestrator"
skill_name: "Regenerative Project Design Orchestrator"
domain: "original-frameworks"
version: "2.2"
evidence_strength: "emerging"
evidence_sources:
  - "Wiggins & McTighe (2005) — Understanding by Design"
  - "Larmer, Mergendoller & Boss (2015) — Gold Standard Project Based Learning"
  - "Manning (2025) — SEEDS regenerative inquiry cycle and regenerative learning design"
  - "Kimmerer (2013) — Braiding Sweetgrass (reciprocity and care)"
  - "Meadows (2008) — Thinking in Systems (leverage, feedback, unintended consequences)"
  - "Buckton et al. (2023) — The Regenerative Lens: regenerative social-ecological systems and reinforcing cycles of wellbeing"
  - "Condliffe et al. (2017) — Project-Based Learning: A Literature Review"
  - "Manning (2025) — Metabolising Regeneration and The SEEDS Cycle"
input_schema:
  required:
    - field: "project_intent"
      type: "string"
      description: "What a project, curriculum, or programme should help students investigate, understand, design, improve, restore, regenerate, or contribute to"
    - field: "learner_stage"
      type: "string"
      description: "Age range or year group"
  optional:
    - field: "curriculum_goals"
      type: "string"
      description: "Required content, standards, competencies, or assessment goals"
    - field: "system_or_context"
      type: "string"
      description: "The specific place and social, ecological, cultural, community, classroom, digital, or institutional system involved"
    - field: "time_available"
      type: "string"
      description: "Lesson sequence, project week, term, semester, year, and any time available after launch for monitoring"
    - field: "community_or_adult_partners"
      type: "string"
      description: "Affected people, knowledge holders, adults, community groups, experts, institutions, or stewards who should be involved"
    - field: "constraints"
      type: "string"
      description: "Assessment, safety, permission, resources, power, cultural protocol, ecological, implementation, or monitoring constraints"
    - field: "pathway_choice"
      type: "string"
      description: "Optional legacy field for a requested learning-design route such as SEEDS, PBL, service learning, or systems inquiry; never treat it as proof of regenerative quality"
    - field: "current_conditions_and_evidence"
      type: "string"
      description: "What is currently known about system health, patterns, needs, assets, prior interventions, and baseline conditions"
    - field: "intended_contribution"
      type: "string"
      description: "The hoped-for change in people, place, relationships, structures, or living systems"
    - field: "desired_ambition"
      type: "string"
      description: "Optional intended level: knowledge/capability building, green, sustainable, restorative, or regenerative"
    - field: "output_mode"
      type: "string"
      description: "Optional: triage for a concise routing diagnosis or full for a complete design; default to triage when essential local information is missing"
output_schema:
  type: "object"
  fields:
    - field: "scope_and_system_boundary"
      type: "object"
      description: "Bounded place and system, affected life, authority, knowledge holders, constraints, and missing information"
    - field: "action_decision"
      type: "object"
      description: "Decision to act, learn first, do less, prototype, hand off, or stop, with reasoning and stop conditions"
    - field: "pathway_options"
      type: "array"
      description: "Compatible learning-design options, explicitly separated from the project's regenerative ambition"
    - field: "recommended_pathway"
      type: "object"
      description: "Recommended combination of pedagogical and systems tools with assumptions, tradeoffs, and alternatives"
    - field: "orchestrated_skill_chain"
      type: "array"
      description: "Selected skills in order with handoff outputs and stop conditions"
    - field: "project_design"
      type: "object"
      description: "The resulting project sequence or programme architecture, including knowledge building, action, feedback, adaptation, and continuation or closure"
    - field: "regenerative_quality_gates"
      type: "array"
      description: "Reported pass, flag, or fail checks for system health, place, reciprocity, ethics, evidence, bounded agency, feasibility, and endurance"
    - field: "regenerative_diagnosis"
      type: "object"
      description: "Current conditions, multidimensional contribution profile, mixed effects, missing evidence, and regenerative claim status"
    - field: "health_evidence_stewardship_plan"
      type: "object"
      description: "Baseline indicators, monitoring cadence, affected-group perspectives, stewardship roles, resources, review triggers, and handoff or closure plan"
    - field: "claim_language"
      type: "object"
      description: "The strongest honest claim currently warranted and the evidence needed before making a stronger one"
    - field: "curriculum_competency_assessment_architecture"
      type: "object"
      description: "When requested: knowledge structure, competency constructs, progression, curriculum sequence, assessment methods, and permitted learning claims"
    - field: "competency_construct_maps"
      type: "array"
      description: "When applicable: definitions, exclusions, components, prerequisites, contexts, construct-irrelevant demands, and prohibited interpretations"
    - field: "competency_evidence_arguments"
      type: "array"
      description: "When applicable: claim-specific sampling, individual evidence, comparison, scoring, moderation, aggregation, accessibility, inference, confidence, and gaps"
chains_well_with:
  - "backwards-design-unit-planner"
  - "project-brief-designer"
  - "self-determined-project-design-protocol"
  - "seeds-regenerative-inquiry-cycle"
  - "agency-scaffold-generator"
  - "service-learning-project-designer"
  - "systems-awareness-iceberg"
  - "aspirational-systems-iceberg"
  - "agency-circles-for-systems-action"
  - "assessment-validity-checker"
  - "scoping-for-transformative-learning-inquiry"
  - "place-based-curriculum-orchestrator"
  - "ecological-inquiry-anchor-designer"
  - "three-horizons-learning-transition-mapper"
  - "mental-model-mapper"
  - "leverage-and-response-design"
  - "curriculum-knowledge-architecture-designer"
  - "competency-unpacker"
  - "kud-knowledge-type-mapper"
  - "learning-progression-builder"
  - "developmental-band-system-designer"
  - "learning-target-authoring-guide"
  - "scope-and-sequence-designer"
  - "assessment-design-orchestrator"
  - "dispositional-knowledge-assessment-designer"
  - "coherent-rubric-logic-builder"
  - "criterion-referenced-rubric-generator"
teacher_time: "10-minute triage; 45–90 minutes for preliminary design, plus local consultation"
tags: ["orchestrator", "composite-framework", "practitioner-framework", "regenerative", "emerging-evidence", "project-design", "competency-based-curriculum", "assessment", "PBL", "backwards-design", "SEEDS", "service-learning", "student-agency", "systems-health", "stewardship", "impact-evidence"]
---

# Regenerative Project Design Orchestrator

## What This Skill Does

This orchestrator helps an educator decide what kind of regenerative contribution is plausible, then selects and sequences the learning-design, curriculum, assessment, systems, and stewardship tools needed to pursue it responsibly at project or programme level.

It makes one distinction non-negotiable:

> **Regenerative ambition is not a pedagogical method.**

Backwards design, project-based learning, SEEDS, service learning, place-based inquiry, and compassionate systems tools answer different design questions. They may be combined. None except SEEDS was created as a specifically regenerative pedagogy, and invoking any of them does not make a project regenerative.

The orchestrator therefore separates:

1. **The intended system contribution:** knowledge building, reduced harm, sustainability, restoration, or regeneration.
2. **The learning-design architecture:** how knowledge, inquiry, practice, critique, assessment, and student decision-making will be organised.
3. **The systems-action architecture:** how the group will understand the system, test an intervention, monitor consequences, and adapt.
4. **The continuation architecture:** how responsibility, resources, feedback, governance, and eventual handoff or closure will be handled.

### Working Definition

Regenerative action aims to increase the enduring capacity of people, communities, places, and living systems to become healthier over time through reciprocal, place-responsive co-evolution. It moves beyond doing less harm or repairing isolated damage by creating conditions, relationships, and feedback cycles that can continue to support life after the initiating project ends.

This is a design standard, not an outcome claim. A project may be **regenerative in intent** or **regenerative by design** before there is evidence that it made a regenerative contribution. Only longitudinal evidence can support the stronger claim.

## Evidence Space and Strength of Evidence

This is a composite practitioner framework. It coordinates research and practitioner traditions that were developed for different purposes. The exact orchestration logic has not been evaluated as a complete educational intervention.

### Component Evidence

- **Regenerative systems framing** (emerging): Buckton et al. (2023) offer a peer-reviewed conceptual framework for regenerative social-ecological systems centred on mutually reinforcing cycles of wellbeing. The framework is conceptual and action-oriented, not an evaluation of school projects.
- **SEEDS Regenerative Inquiry** (emerging/original): Manning (2025) developed SEEDS as a cyclical pedagogy organised around Sense, Envision, Experiment, Design to Last, and Share. It is theoretically grounded and practitioner-tested but has not been independently evaluated.
- **Systems thinking and intervention design** (moderate conceptual/practitioner base): Meadows (2008) supports attention to feedback, leverage, delays, unintended consequences, and the limits of intervention. Classroom applications require adaptation and teacher judgement.
- **Backwards design** (practitioner framework): Wiggins and McTighe (2005) provide a widely used curriculum-alignment discipline. It helps align goals, assessment, and teaching; it does not establish regenerative quality.
- **Project-based learning** (promising, implementation-dependent): Condliffe et al. (2017) concluded that PBL evidence was promising rather than conclusive and highly sensitive to implementation. PBL can organise regenerative work but can also produce impressive activity with thin knowledge or no enduring system contribution.
- **Service learning** (moderate): service-learning research supports benefits when community need, curriculum, reciprocity, and reflection are genuinely integrated. Service learning may still be conventional or restorative rather than regenerative.
- **Reciprocity and care** (philosophical and Indigenous knowledge tradition): Kimmerer (2013) informs relational and reciprocal practice. Citation is not permission to appropriate Indigenous knowledge or bypass local cultural protocols and knowledge holders.

### Synthesis Evidence

The separation of regenerative ambition, learning design, systems action, continuation, and claim status is an original synthesis. Treat it as an emerging design scaffold. It should be tested with educators, communities, and project evidence before stronger claims are made.

### What This Skill Should Not Claim

Do not claim that using this orchestrator or a named pedagogy makes a project regenerative; that a short project demonstrates enduring health; that benefit to one group offsets harm to another; that student learning equals system impact; or that students should carry adult and institutional responsibilities.

### Appropriate Use

Use this skill when an educator wants to design education **for regeneration**, a project **informed by regenerative principles**, a possible **regenerative action project**, or a competency-based curriculum serving those purposes.

Do not use it to force every worthwhile learning experience into real-world action. When knowledge, authority, evidence, time, safety, partnership, or stewardship capacity is insufficient, a knowledge-building inquiry may be the wisest and most educationally responsible route.

## Core Model: Three Judgements Before Routing

### Judgement 1: What contribution profile is plausible?

Profile—not average—the work across ecological health; human wellbeing, justice, and access; relationships and reciprocity; institutional rules and capability; material/resource effects; and continuation/adaptive capacity. For each dimension, use: **unknown/not yet evidenced**, **not applicable with reason**, **degenerative**, **conventional**, **green/harm-reducing**, **sustainable**, **restorative**, or **regenerative design conditions present**.

Keep mixed effects visible. A serious or non-compensable failure caps the overall claim; strength in one dimension cannot purchase permission to harm another. “Regenerative design conditions present” means the design addresses a generative condition, relationship, capability, feedback, rule, or upstream driver and builds reciprocity, stewardship, resources, feedback, and adaptation. It is not an outcome claim.

### Judgement 2: How mature are knowledge and action?

Assess two axes independently:

- **Knowledge maturity:** quality of attention, relevant understanding, systems literacy, place knowledge, bio-empathy, evidence, and awareness of uncertainty.
- **Action maturity:** legitimacy, ethical fit, leverage, proportionality, reversibility, feasibility, monitoring, adaptation, and continuation.

High action with weak knowledge is unsafe. High knowledge without action can still be valuable education for regeneration, especially when authority, readiness, or conditions for responsible intervention are absent. Consider **internal regenerativity**—wellbeing, agency, trust, relationships, and capability—and **external regenerativity**—effects on the wider social-ecological system—without treating improvement in one as compensation for harm in the other.

### Judgement 3: What learning design does the work need?

Select one or more compatible structures. These are not levels on the continuum:

- **Knowledge-building inquiry:** use when the group lacks understanding, evidence, readiness, authority, or a safe action opportunity. Becoming more knowledgeable is a valid outcome.
- **Backwards-design overlay:** use when curriculum goals and defensible evidence of learning must be aligned. This can overlay any other route.
- **Project-based learning:** use for sustained inquiry, authentic purpose, critique, revision, public response, and a product, performance, or intervention.
- **SEEDS:** use when close attention, relationship with place or living systems, bio-empathy, cyclical inquiry, experimentation, stewardship, and continuation are central. Do not restrict it mechanically by age, but calibrate responsibility and abstraction developmentally.
- **Service learning:** use when a genuine community-defined need and reciprocal partnership are central and the academic learning is embedded in the service.
- **Compassionate systems inquiry/action:** use when social, cultural, wellbeing, classroom, or institutional patterns require analysis of structures, mental models, relationships, power, and bounded agency.
- **Place-based or ecological inquiry:** use when a particular place or living system should become a primary source of knowledge rather than a decorative context.
- **Competency-based curriculum architecture:** use when educators need coherent programme-level capabilities, progressions, learning targets, learning opportunities, and assessment claims. Never use it to replace disciplinary knowledge, place, relationship, or system-health evidence.

The smallest coherent combination is better than a maximal chain.

## Regenerative Claim Status

Every output must name one of these statuses:

- **Education for regeneration:** builds knowledge, capability, values, attention, or judgement relevant to future regenerative action; no direct system-impact claim.
- **Regenerative intent:** proposes a life-affirming contribution but lacks sufficient design detail or evidence to pass the regenerative gates.
- **Regenerative by design:** passes the design gates for system understanding, reciprocity, ethics, bounded agency, endurance, and monitoring; outcome remains unknown.
- **Evidence of a regenerative contribution:** follow-up evidence shows a positive direction in relevant system-health indicators, with distributional effects and plausible alternative explanations considered.
- **Insufficient or conflicting evidence:** observed effects do not yet warrant a stronger claim.

Never use **regenerative outcome achieved** as an automatic label. Complex systems, delayed effects, and causal uncertainty make that claim unusually demanding.

## Dependency Maintenance

This skill depends on the learning-design, systems, curriculum, competency, and assessment skills named in `chains_well_with`. Treat that list as a routing inventory, not a maximal chain.

Review this orchestrator whenever a chained skill changes its evidence strength, output schema, quality gates, or major cautions. Do not strengthen the evidence claim of this composite framework unless the composite workflow itself has been tested.

## Routing Logic

1. **Scope:** bound the place and system; identify affected life, knowledge gaps, decision rights, dissent, adult/professional authority, safeguarding, data/publication duties, and follow-up capacity. Route vague proposals to scoping, place, ecological, or knowledge-building inquiry.
2. **Diagnose:** profile the six regenerative dimensions, knowledge/action maturity, and internal/external conditions; keep conflicts visible and assign an honest claim status.
3. **Gate action:** stop for unvalidated need, weak knowledge, unsafe or irreversible action, missing legitimacy or authority, displaced adult responsibility, absent professional approval, inadequate consent/data protection, or no feasible observation, stewardship, handoff, or closure.
4. **Select architecture:** choose the smallest coherent pedagogical and systems combination. For short projects or no post-project steward, default to inquiry, reversible prototype, partner-owned micro-action, recommendation, or closure.
5. **Add competency architecture only when requested:** knowledge architecture → construct map → unpacking/classification → provisional progression and targets → programme spine → competency evidence argument → matched assessment → validity check.
6. **Design evidence and continuation:** establish baselines, affected-group perspectives, mixed and unintended effects, non-compensable harms, cadence, review triggers, governance, resources, adaptation, handoff or closure, and separate learner/system evidence.

## Prompt

```text
You are a regenerative learning-design orchestrator. Diagnose regenerative ambition separately from pedagogy, then design the smallest coherent project or programme workflow that fits.

Inputs:
Project intent: {{project_intent}}
Learner stage: {{learner_stage}}
Curriculum goals: {{curriculum_goals}}
System/place/context: {{system_or_context}}
Current conditions and evidence: {{current_conditions_and_evidence}}
Intended contribution: {{intended_contribution}}
Desired ambition: {{desired_ambition}}
Time available, including follow-up: {{time_available}}
Community/adult partners and affected knowledge holders: {{community_or_adult_partners}}
Constraints: {{constraints}}
Requested learning-design route, if any: {{pathway_choice}}
Output mode: {{output_mode}}

NON-NEGOTIABLE DISTINCTIONS:
1. Regenerative ambition is not a pedagogical method. Backwards design, PBL, SEEDS, service learning, systems inquiry, and place-based learning perform different jobs and may be combined.
2. Education for regeneration is not the same as a regenerative real-world outcome.
3. Regenerative intent, regenerative-by-design status, and evidence of a regenerative contribution are different claims.
4. Student learning and system impact require separate evidence.
5. A useful restorative or knowledge-building project is preferable to an inflated regenerative claim.
6. Competencies cannot replace disciplinary knowledge, place, relationship, or local legitimacy.

STEP 1 — SCOPE THE SYSTEM
Identify:
- first: exact curriculum outcomes, lessons/time available, specific place or issue, partner authority and continuation capacity, and learner/access profile;
- specific place and system boundary;
- affected human, institutional, more-than-human, and future stakeholders;
- who defines health, need, and value;
- current assets, vitality, patterns, damage, and prior interventions;
- knowledge gaps and missing voices;
- authority, power, safety, time, resource, cultural-protocol, and monitoring constraints;
- proposal, consent, veto, implementation, monitoring, representation, publication-review, and closure rights, including how dissent is recorded and participation is resourced or reciprocated;
- safeguarding, privacy, data minimisation, accessibility, consent/assent, withdrawal, and publication requirements.

If the inputs do not support a defensible scope, do not invent local facts. State what must be learned and recommend the appropriate scoping or inquiry skill.

STEP 2 — DIAGNOSE THE REGENERATIVE AMBITION
Profile ecological health; human wellbeing, justice and access; relationships and reciprocity; institutional rules and capability; material/resource effects; and continuation/adaptive capacity. For each dimension use unknown/not yet evidenced, not applicable with reason, degenerative, conventional, green/harm-reducing, sustainable, restorative, or regenerative design conditions present. Do not assign a substantive level without sufficient local evidence or average dimensions; serious harm caps the claim and an unresolved critical unknown caps it at intent.

Assess knowledge maturity and action maturity separately. Also distinguish internal regenerative conditions—wellbeing, agency, trust, relationships, and capability—from external social-ecological effects. Do not use strength on one axis to conceal weakness or harm on another.

For the classification, test:
- Does it address a generative condition, relationship, capability, feedback loop, rule, information flow, goal, mental model, or upstream driver rather than only a symptom?
- Is the intended health gain defined for specific people and place?
- Is reciprocity present rather than extraction or charity?
- Could capability, relationships, or living-system health continue improving after the initiating project ends?
- Are stewardship, resources, governance, feedback, and adaptation designed in?
- Are burdens, benefits, displaced harms, delayed effects, and non-compensable harms visible?

Name the current claim status: education for regeneration, regenerative intent, regenerative by design, evidence of a regenerative contribution, or insufficient/conflicting evidence.

STEP 3 — DECIDE WHETHER TO ACT
Apply the Just Action tests:
- Necessity: Is intervention needed, or is recovery already occurring?
- Proportionality: What is the smallest intervention that could work?
- Reversibility: Can it be stopped or undone if it misfires?
- Equity and power: Who benefits, who bears burdens, who decides, and whose knowledge counts?
- Ethics: Does it respect the intrinsic value of people, other beings, places, and future generations?
- System sensitivity: What feedback loops, delays, dependencies, or spillovers could it disturb?
- Bounded agency: What belongs to students, and what remains adult or institutional responsibility?
- Governance: Who can propose, consent, veto, review representation, decide, adapt, and close—and how are dissent and less-powerful voices handled?
- Safeguarding and publication: What data, testimony, images, sensitive locations, or community knowledge are involved, and who can withdraw or review public claims?
- Professional responsibility: What licensed review, authority approval, accessibility, insurance, or liability checks remain adult obligations?

If action is not yet warranted, design a rigorous knowledge-building inquiry and state what evidence or capability would justify reconsideration.

When time is six weeks or less or no steward exists after the project, prefer inquiry, reversible prototype, partner-owned micro-action, recommendation, or closure. Do not design an intervention that depends on unavailable continuation.

STEP 4 — SELECT THE LEARNING-DESIGN ARCHITECTURE
Select one or more compatible routes:
- knowledge-building inquiry;
- backwards-design overlay;
- project-based learning;
- SEEDS;
- service learning;
- compassionate systems inquiry/action;
- place-based or ecological inquiry;
- competency-based curriculum architecture when programme-level progression and assessment are requested.

For every selected route, explain its distinct function. Do not use every route by default. Treat a requested route as a preference to evaluate, not a guarantee of fit.

If using the competency route:
1. Map the knowledge architecture before finalising competencies.
2. Define each construct, exclusions, components, prerequisite knowledge, contexts, construct-irrelevant demands, and prohibited interpretations; then unpack and classify it.
3. Build provisional progressions, developmental targets, knowledge entitlements, recurring/contrasting contexts, disciplinary ownership, time allocation, and assessment windows. Label progressions hypothesised until anchor samples, multi-teacher moderation, adjacent-stage distinguishability, learner-group review, alternative pathways, and a documented revision decision support them.
4. For every reported competency, build an evidence argument specifying tasks, contexts, occasions, individual evidence, comparison/delay/transfer evidence, scoring, moderation, aggregation, missing evidence, accessibility, opportunity to learn, permitted inference, confidence, and gaps.
5. Match constructs to methods; do not infer or grade a disposition from one rubric-scored task. Group work alone cannot support an individual claim.
6. Distinguish performance, bounded capability, learning, durability, transfer, and disposition from system impact. Never include system effects in a learner grade.

STEP 5 — BUILD THE SKILL CHAIN
For every skill, name:
- purpose;
- exact source field and target required input field;
- output produced;
- handoff to the next skill;
- whether the step is automatically invocable or requires a deliberate manual/user-invoked checkpoint;
- do-not-proceed-if condition.

Partner legitimacy/consent, safeguarding and publication review, professional approval, and action authorisation are always manual checkpoints and cannot be auto-cleared.

For the competency route, use these canonical handoffs where selected:
- project/programme data → knowledge architecture `curriculum_input_type`, `domain_or_subject`, `learner_stage`, `learning_goals`;
- knowledge map + construct map → unpacker `competency_descriptor`, `student_level` and KUD `curriculum_input`, `learner_stage`;
- indicators + prerequisites → progression `target_skill`, `student_level`; mission/context → manual band design `school_mission`, `age_range`, `programme_context`;
- construct + bands + purpose → learning targets `competency_name`, `competency_definition`, `band_range`, `programme_purpose`;
- validated targets, bands and knowledge entitlements → scope/sequence `subject_or_programme`, `developmental_bands`, `intended_outcomes`;
- evidence argument → assessment design `learning_goal`, `context`, `assessment_purpose`; pass it intact inside validity `assessment_description`, with exact claim in `intended_learning`, plus `student_level`, purpose, marking approach and stakes. Stop when any required value is unavailable; route dispositions through the manual assessor’s five required fields.

STEP 6 — DESIGN THE PROJECT OR PROGRAMME
Include:
- knowledge and readiness building before and during action;
- encounter with the relevant people, place, and system;
- divergent possibility generation and evidence-based convergence;
- criteria, exemplars, feedback, revision, and individual learning evidence;
- small reversible experiments before larger intervention;
- feedback gathering, measurement, reflection, and adaptation;
- continuation, handoff, maintenance, governance, or responsible closure;
- realistic adult, institutional, partner, and project-management responsibilities.

For a short unit, default to a manageable evidence bundle: one diagnostic, two formative checks, one group artefact used only as contextual evidence, and one individual disciplinary explanation or defence.

STEP 7 — DESIGN THE HEALTH, EVIDENCE, AND STEWARDSHIP PLAN
Specify:
- baseline indicators;
- intended direction of change;
- leading and lagging social, ecological, relational, capability, or institutional indicators;
- evidence sources, affected-group perspectives, and knowledge limits;
- positive/negative and intended/unintended effects, including changes in access, belonging, enforcement, exclusion, or displacement where relevant;
- monitoring cadence and review triggers;
- stewardship roles, decision rights, routines, resources, and succession;
- adaptation or closure conditions;
- separate measures of student learning and system effects.

Before action, record the baseline, indicators, cadence, stopping rules, plausible confounders, missing-data approach, and exact public claim each evidence level would permit. Give affected partners a route to review interpretation and representation.

Do not confuse activity counts with system health. Trees planted, posters displayed, money raised, or participants reached may be implementation data; they do not by themselves demonstrate regeneration.

OUTPUT MODE:
- Default to **TRIAGE** when `output_mode` is triage, essential local inputs are missing, or the user has not requested a full design. Return only: Scope and Missing Information; Contribution Profile and Claim Status; Act/Learn First/Do Less; Recommended Route; Stop Conditions; Next Skill and Required Inputs.
- Use **FULL DESIGN** only when requested and sufficiently grounded. Return exactly:

## Scope and System Boundary
[Place, system, affected life, authority, knowledge holders, constraints, missing information]

## Regenerative Diagnosis
- **Provisional contribution profile:** [each relevant dimension, mixed effects, overall ceiling, and reasoning]
- **Knowledge maturity:** [strengths, gaps, and uncertainty]
- **Action maturity:** [legitimacy, leverage, ethics, feasibility, and continuation]
- **Internal and external conditions:** [how they relate, reinforce, or conflict]
- **Current claim status:** [status and reasoning]
- **What supports the classification:** [evidence]
- **What prevents a stronger claim:** [missing design or evidence]
- **Strongest honest language:** [sentence the educator may use]

## Act, Learn First, or Do Less?
[Decision, Just Action reasoning, and stop conditions]

## Learning-Design Options
[Compatible options, distinct functions, tradeoffs, and recommendation]

## Recommended Learning and Systems Architecture
[Selected combination and why]

## Curriculum, Competency, and Assessment Architecture
[If applicable: knowledge structure; `competency_construct_maps[]`; provisional progressions; learning targets; scope and sequence; `competency_evidence_arguments[]`; methods and permitted claims; otherwise state not requested]

## Orchestrated Skill Chain
[Ordered skills, inputs, outputs, handoffs, and do-not-proceed conditions]

## Project or Programme Design
[Teacher-usable sequence or programme spine]

## Health, Evidence, and Stewardship Plan
[Indicators, baseline, cadence, perspectives, roles, resources, review triggers, handoff/adaptation/closure]

## Regenerative Quality Gates
Report each as PASS, FLAG, FAIL, or NOT YET EVIDENCED:
- [ ] System and place are specifically bounded.
- [ ] Health is defined with affected people and appropriate knowledge holders.
- [ ] Decision, consent, veto, representation, publication-review, adaptation, and closure rights are explicit; dissent is visible.
- [ ] Human, more-than-human, and future effects are considered where relevant.
- [ ] Critical knowledge gaps and student readiness are addressed before action.
- [ ] Need, reciprocity, cultural protocol, and community legitimacy are established.
- [ ] Proposed action addresses more than a visible symptom.
- [ ] Necessity, proportionality, reversibility, equity, ethics, and system sensitivity are tested.
- [ ] Student agency is real, safe, and bounded; adult and institutional responsibilities are explicit.
- [ ] Safeguarding, privacy, accessibility, consent/assent, withdrawal, data minimisation, and representation/publication review are adequate.
- [ ] Required professional review, public-authority approval, insurance, and liability arrangements are assigned to adults or institutions.
- [ ] Internal regenerative conditions and external system effects are both examined without compensating one against the other.
- [ ] Baseline indicators and a feasible monitoring cadence exist.
- [ ] Negative, delayed, displaced, and unintended effects are examined.
- [ ] Non-compensable harms are named rather than hidden inside a net-positive total.
- [ ] Stewardship includes ownership, decision rights, routines, resources, feedback, adaptation, and succession or closure.
- [ ] Student learning evidence is distinct from system-impact evidence.
- [ ] Competencies do not displace disciplinary, place-based, cultural, or ecological knowledge.
- [ ] Assessment methods fit the construct, and claims distinguish performance, capability, learning, durability, transfer, and disposition.
- [ ] Every reported competency has an individual evidence argument; progressions are provisional and reviewable.
- [ ] System effects do not influence learner grades.
- [ ] Claim language does not exceed the available evidence.

## Claim Language
- **Warranted now:** [precise claim]
- **Not yet warranted:** [stronger claim to avoid]
- **Evidence needed next:** [what would justify revisiting the claim]
```

## Common Pitfalls

1. **Treating pedagogies as regeneration levels.** SEEDS, PBL, backwards design, service learning, and systems tools answer different questions.
2. **Using “regenerative” as an intention adjective.** A caring purpose does not establish systemic effect or endurance.
3. **Forcing action.** A rigorous knowledge-building inquiry can be the wiser regenerative educational choice.
4. **Mistaking stewardship for a named caretaker.** Continuation also requires authority, routines, resources, information, feedback, adaptation, and succession.
5. **Mistaking activity for health.** Outputs and participation counts are not evidence that a system became healthier.
6. **Net-positive laundering.** Aggregate benefit must not conceal serious harm, unequal burden, or damage displaced elsewhere.
7. **Heroic student-fixer narratives.** Young people should not be assigned institutional or planetary responsibilities without power and adult support.
8. **Community extraction.** Interviewing or displaying community knowledge without reciprocity, consent, relationship, or benefit is not regenerative.
9. **Thin knowledge beneath impressive work.** Authentic audiences and polished products can conceal weak understanding and unequal participation.
10. **Causal overclaiming.** Positive change after a project does not prove the project caused it; complex systems have multiple interacting causes.
11. **Competency capture.** Generic capabilities and rubrics can erase the knowledge, relationships, places, and power conditions that make regenerative action possible.

## Known Limitations

1. **The contribution profile is interpretive.** Ratings depend on system boundaries, timeframe, values, evidence, dimensions selected, and who participates in judgement.
2. **Cannot supply local legitimacy.** The skill cannot determine who is authorised to speak for a community, place, culture, species, or institution. Relationship-building and local consultation cannot be automated.
3. **Cannot validate system-health indicators remotely.** Suggested indicators require local scientific, cultural, community, or professional review. What is measurable is not necessarily what matters most.
4. **Cannot establish causality.** Monitoring can show trends and perspectives; it rarely proves that a student project produced the observed system change.
5. **Long time horizons exceed school projects.** Enduring effects may only become visible after students, teachers, funding, or leadership have changed.
6. **Produces an orchestrated design, not every component output.** Chained skills must still be run, reviewed, and adapted in context.
7. **The composite workflow is unvalidated.** Its conceptual coherence does not demonstrate improved learning or regenerative outcomes.

## Verification Checklist

- [ ] Regenerative ambition and pedagogical method are explicitly separated.
- [ ] The work receives a multidimensional contribution profile, mixed effects remain visible, and claim status respects the weakest evidenced material condition and cannot exceed an unresolved critical unknown.
- [ ] Place, system boundary, affected life, power, and knowledge holders are named.
- [ ] The possibility of learning first, smaller action, or no action is considered.
- [ ] Every selected learning route has a distinct function.
- [ ] Knowledge, action, assessment, system evidence, and stewardship form one coherent design.
- [ ] Baseline, indicators, cadence, review triggers, and succession or closure are present.
- [ ] Student learning and real-world effects use separate evidence.
- [ ] Any competency route begins with knowledge architecture and ends with assessment-validity checks.
- [ ] Competency constructs, evidence arguments, provisional progressions, individual evidence, moderation, accessibility, and opportunity to learn are explicit where relevant.
- [ ] Performance, capability, learning, durability, transfer, disposition, and system impact are not collapsed into one claim.
- [ ] Claim language is no stronger than the evidence.
- [ ] The output remains usable outside any particular school or programme architecture.
